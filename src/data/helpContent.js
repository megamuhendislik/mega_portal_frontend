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
        description: 'Kart okutma ile giriş/çıkış, tolerans kuralları, mola takibi ve canlı durum bilgisi',
        permission: null,
        link: '/',
        images: [
            { src: '/help-images/02-dashboard-top.png', caption: 'Ana sayfa — özet kartları (çalışma süresi, mola, fazla mesai, izin durumu), haftalık OT limiti ilerleme çubuğu' },
            { src: '/help-images/02-dashboard-full.png', caption: 'Ana sayfa (devamı) — devam analiz grafiği, son aktiviteler, yaklaşan etkinlikler ve aylık performans özeti' },
            { src: '/help-images/07-attendance.png', caption: 'Mesai Takibi — ekip listesi, çalışma/fazla mesai/eksik süre sütunları, çevrimiçi durum göstergeleri', permission: 'APPROVAL_OVERTIME' }
        ],
        steps: [
            {
                title: 'Giriş Yapma (Kart Okutma)',
                description: 'İşe geldiğinizde kartınızı kart okuyucuya okutun. Sistem giriş saatinizi otomatik kaydeder ve mesainiz başlar. Giriş kaydınız anlık olarak sisteme yansır.'
            },
            {
                title: 'Canlı Durum Takibi',
                description: 'Dashboard\'daki 5 özet kartında anlık durumunuzu görebilirsiniz: (1) Bugün Çalışma — toplam çalışılan saat ve hedef, (2) Kalan Mola — kullanılan/hak mola dakikası, (3) Fazla Mesai — onaylanan/bekleyen/potansiyel dakikalar, (4) İzin Durumu — yıllık izin bakiyesi (gün) + mazeret izni (saat), (5) Doğum Günü İzni — sadece doğum ayınızda görünür. Bu veriler her 60 saniyede bir otomatik güncellenir. Sekmeyi kapattığınızda güncelleme durur, geri açtığınızda otomatik yenilenir.'
            },
            {
                title: 'Haftalık Fazla Mesai Limiti',
                description: 'Fazla mesai kartının altında haftalık OT limit ilerleme çubuğu bulunur. Kullanılan/limit saat gösterilir. Renk kodları: yeşil (%0-70) → turuncu (>%70) → kırmızı (>%90) → kırmızı pulsar animasyon (dolu). Limit dolduğunda yeni mesai talebi oluşturamazsınız.'
            },
            {
                title: 'Mola Kullanımı',
                description: 'Mola vermek için çıkış yapın (kart okutun), dönüşte tekrar giriş yapın. İki okutma arasındaki süre "potansiyel mola" olarak hesaplanır. Üst menüdeki kahve ikonunda mola durumunuz gösterilir: mavi = normal, turuncu = mola hakkınızın %80\'ini kullandınız, kırmızı = mola hakkınız aşıldı. Günlük mola hakkı genellikle 30 dakikadır ve çalışma sürenizden otomatik düşülür.'
            },
            {
                title: 'Çıkış Yapma',
                description: 'Mesai bitiminde kartınızı tekrar okutun. Sistem çıkış saatinizi kaydeder ve çalışma sürenizi otomatik hesaplar. Çıkış yapmadan ayrılmak puantaj kaydınızı olumsuz etkiler — detaylar aşağıdaki uyarılarda.'
            },
            {
                title: 'Son Aktiviteler ve Yaklaşan Etkinlikler',
                description: 'Dashboard\'un sağ panelinde son talep durumlarınız (onay/red/bekleyen) ve önümüzdeki 14 güne ait etkinlikler (tatiller, izinler, mesai atamaları, sağlık raporları) listelenir. Ardışık tatiller otomatik birleştirilir (örn: "Ramazan Bayramı, 3 gün"). Etkinlikler renk kodludur: kırmızı=tatil, yeşil=izin, mor=mesai ataması, amber=mesai talebi, pembe=sağlık raporu.'
            }
        ],
        tips: [
            { type: 'info', text: 'Tolerans Türleri: Sistemde iki farklı tolerans vardır. (1) Servis Toleransı (varsayılan 0 dk, şablonda tanımlanır) — Servis kullanan personel için vardiya başlangıç/bitiş saatlerine yakın okutmaları vardiya saatine yuvarlar. Servis toleransı 0 ise yuvarlama yapılmaz. (2) Geç Kalma Toleransı (varsayılan 30 dk) — vardiya bitiş saatinden sonraki uzatma penceresidir. Örneğin vardiya bitişi 18:00 ise, 18:30\'a kadar yapılan çıkış normal mesai sayılır ve fazla mesai oluşturmaz.' },
            { type: 'info', text: 'Mola Hesaplama: Günlük mola hakkı (varsayılan 30 dk) toplam çalışma sürenizden otomatik düşülür. Gün içinde çıkış-giriş arasındaki boşluklar "potansiyel mola" olarak hesaplanır. Mola hakkınızı aşarsanız, aşan kısım çalışma sürenizden kesilir.' },
            { type: 'warning', text: 'Çıkış yapmadan (kart okutmadan) ayrılmayın! Kayıt "AÇIK" kalır ve gece yarısı (00:01) otomatik görevi bu kaydı vardiya bitiş saatinde kapatır. Bu durum istenmeyen "Potansiyel Ek Mesai" kaydı oluşturabilir ve puantajınızda yanlış veriler görünür.' },
            { type: 'success', text: 'Kart okutucunuz arızalıysa veya kartınızı unuttaysanız Talepler sayfasından "Kartsız Giriş Talebi" oluşturabilirsiniz. Bu talep yöneticinizin onayına gider ve onaylandığında puantaj kaydınız oluşturulur.' },
            { type: 'info', text: 'Doğum Gününüzde: Dashboard\'da özel kutlama banner\'ı görünür (konfeti animasyonu). Doğum günü izni hakkınız varsa kalan gün bilgisi pembe kartta gösterilir. Banner\'ı "Bir daha gösterme" ile kapatabilirsiniz.' }
        ],
        faq: [
            { q: 'Kart okutmayı unuttum, ne yapmalıyım?', a: 'Talepler sayfasından "Kartsız Giriş Talebi" oluşturun. Giriş ve çıkış saatlerinizi belirtin. Talep yöneticinize gider ve onaylandığında puantaj kaydınız oluşturulur. Bu talepler geçmiş 2 mali ay içindeki tarihler için verilebilir.' },
            { q: 'Gece fazla mesai yaptım, kayıtlarım nasıl hesaplanır?', a: 'Gece 00:00\'ı geçen kayıtlar, sistem tarafından otomatik kapatılır (kartsız çıkışları ayıklamak için). 00:00\'dan sonra mesaiye devam etmeniz gerekiyorsa kartınızla çıkış ve giriş yapın.' },
            { q: 'Mola sürem neden azalıyor?', a: 'Gün içinde her çıkış-giriş arası "potansiyel mola" olarak sayılır. Toplam potansiyel mola süreniz üst menüdeki mola göstergesinde takip edilir. Günlük mola hakkı (genellikle 30 dk) otomatik olarak çalışma sürenizden düşülür.' },
            { q: 'Fazla mesai nasıl algılanır?', a: 'Vardiya bitişiniz 18:00 ise ve geç kalma toleransı 30 dk ise: 18:30\'a kadar çıkış yaparsanız fazla mesai oluşmaz. 18:30\'dan sonra çıkarsanız (örneğin 19:00), 18:00-19:00 arası = 60 dk fazla mesai hesaplanır. Bu süre minimum eşiği (varsayılan 30 dk) geçtiği için "Potansiyel Ek Mesai" kaydı oluşturulur.' },
            { q: 'Aylık performans özeti nedir?', a: 'Dashboard\'un alt kısmında aylık performans özeti ve bakiye karuseli bulunur. Her ay için hedef çalışma saati, gerçekleşen ve fark (bakiye) gösterilir. Pozitif bakiye = hedefin üstünde çalışma, negatif = eksik çalışma.' }
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
            { src: '/help-images/03-profile-personal.png', caption: 'Profilim sekmesi — kişisel bilgiler (ad, soyad, e-posta, TC, doğum tarihi, telefon), sol panelde avatar ve sicil numarası' },
            { src: '/help-images/03-profile-contact.png', caption: 'İletişim sekmesi — ikinci telefon, adres, acil durum kişisi bilgileri' },
            { src: '/help-images/03-profile-notifications.png', caption: 'Bildirimler sekmesi — 7 bildirim tercih toggle\'ı (izin onay/red, mesai onay/red, vekalet, eskalasyon, sistem duyuruları)' },
            { src: '/help-images/03-profile-security.png', caption: 'Güvenlik sekmesi — eski şifre, yeni şifre ve şifre onay alanları ile şifre değiştirme formu' }
        ],
        steps: [
            { title: 'Kişisel Bilgiler (Profilim Sekmesi)', description: 'Sol panelde büyük avatar (adınızın baş harfleri), ad-soyad, departman ve sicil numaranız görünür. Sağ panelde e-posta, TC kimlik no, doğum tarihi ve telefon alanlarını düzenleyebilirsiniz. Ad, soyad, departman ve pozisyon bilgileri yönetici tarafından atandığı için salt okunurdur.' },
            { title: 'İletişim Bilgileri', description: '"İletişim" sekmesinde ikinci telefon numarası, adres (metin alanı) ve acil durum iletişim bilgilerinizi (kişi adı + telefon) güncelleyebilirsiniz. Bu bilgiler Şirket Rehberi\'nde görünür.' },
            { title: 'Bildirim Tercihleri', description: '"Bildirimler" sekmesinde 7 farklı bildirim türünü açıp kapatabilirsiniz: İzin Onaylandı (yeşil), İzin Reddedildi (kırmızı), Mesai Onaylandı (yeşil), Mesai Reddedildi (kırmızı), Vekâlet Talepleri (amber), Eskalasyon Uyarıları (turuncu), Sistem Duyuruları (mavi). Her toggle\'ın yanında açıklama metni bulunur.' },
            { title: 'Şifre Değiştirme', description: '"Güvenlik" sekmesinden eski şifrenizi girip yeni şifre belirleyebilirsiniz. Şifre alanlarında göz ikonu ile şifreyi göster/gizle yapabilirsiniz. Yeni şifre en az 6 karakter olmalıdır. Şifre onayı eşleşmelidir. Sistem yöneticisi şifrenizi sıfırladıysa, ilk girişte otomatik olarak Güvenlik sekmesine yönlendirilirsiniz.' }
        ],
        tips: [
            { type: 'info', text: 'Profil sayfanızdaki departman, pozisyon ve sicil numarası bilgileri yönetici tarafından atanır. Bu alanları kendiniz değiştiremezsiniz.' },
            { type: 'warning', text: 'Şifreniz en az 6 karakter olmalıdır. Güçlü bir şifre için büyük/küçük harf, rakam ve özel karakter kombinasyonu kullanın.' },
            { type: 'info', text: 'Bildirim tercihleri kişiseldir. Kapattığınız bildirim türleri için e-posta veya uygulama içi bildirim almayacaksınız. Önemli bildirimleri (izin onay/red) kapatmamanız önerilir.' },
            { type: 'success', text: 'Sol paneldeki avatar ve isim bilginiz tüm sayfaların üst çubuğunda ve yan menüde de görünür. Avatar, adınızın baş harflerinden otomatik oluşturulur.' }
        ],
        faq: [
            { q: 'Departman veya pozisyon bilgimi nasıl değiştiririm?', a: 'Departman ve pozisyon bilgileri yönetici tarafından Çalışan Yönetimi sayfasından güncellenir. Kendiniz değiştiremezsiniz. İK birimine başvurun.' },
            { q: 'Şifremi unuttum ne yapmalıyım?', a: 'Sistem yöneticinize başvurun. Admin panelinden (Sistem Sağlığı > Şifre Sıfırlama) şifreniz sıfırlanabilir. İlk girişte yeni şifre belirlemeniz istenecektir.' },
            { q: 'TC kimlik numaram neden kilitli görünüyor?', a: 'TC kimlik numarası hassas veri olarak sınıflandırılmıştır. Değiştirmek için SENSITIVE_DATA_CHANGE yetkisine sahip bir yöneticinin düzenlemesi gerekir.' }
        ]
    },
    {
        id: 'izin-talepleri',
        title: 'İzin Talepleri',
        icon: CalendarDays,
        description: 'Yıllık izin, mazeret izni, avans izin başvurusu, sıralı düşüm sistemi ve bakiye takibi',
        permission: null,
        link: '/requests',
        images: [
            { src: '/help-images/10-requests-my.png', caption: 'Kendi Taleplerim sekmesi — izin/mesai/kartsız giriş talep listesi, durum filtreleri ve yeni talep oluşturma' },
            { src: '/help-images/10-requests.png', caption: 'Talepler sayfası — 4 sekmeli yapı (Kendi Taleplerim, Gelen Talepler, Ek Mesai, Analiz), talep detay görünümü' }
        ],
        steps: [
            {
                title: 'İzin Bakiyesi Kontrolü',
                description: 'Dashboard\'daki "İzin Durumu" kartında yıllık izin bakiyenizi (gün olarak) ve mazeret izni bakiyenizi (saat olarak, yıllık 18 saat) görebilirsiniz. Talepler sayfasında daha detaylı bilgi: toplam hak ediş, kullanılan gün, avans kullanımı ve kalan bakiye. Bakiye "İlk Hak Edilen → İlk Düşülür" yöntemiyle hesaplanır.'
            },
            {
                title: 'Yeni İzin Talebi Oluşturma',
                description: 'Talepler sayfasında "Kendi Taleplerim" sekmesinden yeni talep oluşturun. İzin türünü seçin: Yıllık İzin, Mazeret İzni (saat bazlı, günlük max 4.5 saat, yıllık 18 saat), Doğum Günü İzni (doğum ayınızda kullanılabilir) veya diğer yasal izin türleri. Başlangıç ve bitiş tarihlerini belirleyin, gerekirse açıklama ekleyin.'
            },
            {
                title: 'Onay Süreci',
                description: 'Talebiniz birincil (PRIMARY) yöneticinize gider. Birincil yönetici bulunamazsa sistem otomatik olarak ikincil yönetici, departman yöneticisi veya üst hiyerarşiyi tarar. Onay/red bildirimi alırsınız. Onaylanan izinler takvimde yeşil olarak gösterilir.'
            },
            {
                title: 'İzin İptali',
                description: 'Henüz onaylanmamış ("Bekleyen") talepleri kendiniz iptal edebilirsiniz. Onaylanmış izinlerin iptali için sistem yöneticinize başvurun — iptal edildiğinde kullanılan gün bakiyenize geri yüklenir (önce avans bakiyesi iade edilir).'
            }
        ],
        tips: [
            { type: 'info', text: 'Sıralı Düşüm (FIFO): İzin günleri "İlk Hak Edilen → İlk Düşülür" kuralıyla çalışır. En eski dönemdeki bakiye önce kullanılır. Devir izinleri bu sistemle doğru takip edilir.' },
            { type: 'info', text: 'Mazeret İzni: Yıllık 18 saat hak, günlük maksimum 4.5 saat. Saat bazlı çalışır. Bakiye Dashboard\'da turuncu kartta gösterilir. Her yılın 1 Ocak\'ında sıfırlanır.' },
            { type: 'warning', text: 'Avans İzin: Henüz hak etmediğiniz günleri önceden kullanmanızdır. Bakiyeniz negatife düşebilir. Avans kullanımı ayrıca takip edilir ve gelecek hak edişlerinizden otomatik düşülür.' },
            { type: 'success', text: 'Geriye dönük izin talebi 2 mali ay penceresi içinde verilebilir. Örneğin Şubat dönemindeyseniz (26 Ocak – 25 Şubat), Aralık dönemine kadar geriye dönük talep oluşturabilirsiniz.' }
        ],
        faq: [
            { q: 'Kaç gün izin hakkım var?', a: 'Kıdeminize göre: 1–5 yıl: 14 gün, 5–15 yıl: 20 gün, 15+ yıl: 26 gün. Dashboard\'daki izin kartında güncel bakiyenizi görebilirsiniz.' },
            { q: 'Mazeret izni nasıl kullanırım?', a: 'Yeni talep oluştururken "Mazeret İzni" türünü seçin. Başlangıç ve bitiş saatlerini girin (günlük max 4.5 saat). Yıllık 18 saatlik kotanız Dashboard\'da turuncu kartta gösterilir.' },
            { q: 'Doğum günü iznim var mı?', a: 'Doğum ayınızda kullanılabilecek özel izin hakkınız varsa Dashboard\'da pembe kartta görünür. Bu izin sadece doğum ayınızda kullanılabilir.' },
            { q: 'Avans izin nedir?', a: 'Henüz hak etmediğiniz izin günlerini önceden kullanmanızdır. Bakiyeniz negatife düşebilir. İade durumunda önce avans bakiyesi geri yüklenir.' }
        ]
    },
    {
        id: 'ek-mesai',
        title: 'Ek Mesai',
        icon: Timer,
        description: 'Üç kaynaklı ek mesai sistemi (Planlı/Algılanan/Manuel), haftalık limit, talep akışı ve 2 mali ay kuralı',
        permission: null,
        link: '/requests',
        images: [
            { src: '/help-images/10-requests.png', caption: 'Ek Mesai sekmesi — planlı/algılanan/manuel mesai listesi, gün bazlı gruplama, segment bazlı talep butonları ve durum rozetleri' }
        ],
        steps: [
            {
                title: 'Üç Mesai Kaynağını Anlama',
                description: 'Sistem 3 farklı kaynaktan ek mesai yönetir: (1) Planlı Mesai (INTENDED) — yöneticiniz tarafından size atanan, önceden planlanmış mesai. (2) Algılanan Mesai (POTENTIAL) — vardiya saatinizi aştığınızda sistem tarafından otomatik tespit edilen mesai. Vardiya öncesi erken giriş de algılanır. (3) Manuel Giriş (MANUAL) — geçmiş bir tarih için sizin elle girdiğiniz mesai talebi.'
            },
            {
                title: 'Planlı Mesai (Yönetici Ataması)',
                description: 'Yöneticiniz size mesai ataması yapar. Ek Mesai sekmesinde "Planlı Mesai İstekleri" bölümünde görünür. "Talep Et" düğmesine tıklayarak ClaimModal açılır — tarih, süre ve açıklama bilgileri otomatik doldurulur. İsterseniz iş tanımı ekleyerek gönderebilirsiniz.'
            },
            {
                title: 'Algılanan Mesai (Otomatik Tespit)',
                description: 'Vardiya öncesi erken giriş veya vardiya sonrası geç çıkış yaptığınızda sistem otomatik "Potansiyel Ek Mesai" kaydı oluşturur. Koşullar: (1) Geç kalma toleransını (30 dk) aşmanız, (2) Günlük toplam fazla mesai süresinin minimum eşiği (30 dk) geçmesi. Potansiyel mesailer gün bazlı gruplar ve segment bazlı (Vardiya Öncesi/Sonrası/Tatil/Karma) olarak listelenir. Her segmentin yanında "Talep Et" butonu bulunur.'
            },
            {
                title: 'Manuel Mesai Girişi',
                description: 'Geçmiş bir tarih için mesai talebi oluşturmak isterseniz ManualEntryModal formunu kullanın. Tarih, başlangıç/bitiş saati, süre ve iş tanımını girin. Haftalık OT limiti kontrolü burada da uygulanır. Bu talep doğrudan yönetici onayına gider.'
            },
            {
                title: 'Haftalık Fazla Mesai Limiti',
                description: 'Her çalışanın haftalık OT limiti vardır (varsayılan 30 saat). Rolling 7 günlük pencerede ONAYLANMIŞ + BEKLEYEN mesai saatleri sayılır. Limit dolduğunda yeni mesai talebi oluşturamazsınız. Dashboard ve talep formlarında ilerleme çubuğu gösterilir.'
            },
            {
                title: 'Talep Akışı ve Onay',
                description: 'Mesai kayıtları şu akışı izler: POTANSIYEL (taslak) → BEKLEYEN (talep edildi) → ONAYLANDI / REDDEDİLDİ / İPTAL. Onaylanan mesai puantajınıza ve aylık çalışma özetinize yansır.'
            }
        ],
        tips: [
            { type: 'info', text: 'Potansiyel mesai, henüz talep edilmemiş fazla çalışmadır. "Talep Et" düğmesine basana kadar taslak halinde kalır ve yöneticinize gitmez. Talep etmediğiniz potansiyel mesailer puantajınıza yansımaz.' },
            { type: 'info', text: 'Mesai Tipleri: Vardiya Öncesi (PRE_SHIFT) = erken giriş mesaisi, Vardiya Sonrası (POST_SHIFT) = geç çıkış mesaisi, Tatil (OFF_DAY) = tatil günü çalışma, Karma (MIXED) = birden fazla segment. Her tip farklı renkli badge ile gösterilir.' },
            { type: 'warning', text: 'Tüm mesai talepleri 2 mali ay geriye dönük pencere içinde yapılmalıdır. Bu süreyi aşan mesailer talep edilemez ve potansiyel kayıtlar otomatik expire olur.' },
            { type: 'success', text: 'Hafta sonu ve resmi tatillerde yapılan çalışmalar, tatil günü çalışma programınız "tatil" ise otomatik olarak ek mesai kabul edilir.' }
        ],
        faq: [
            { q: 'Potansiyel mesai ile bekleyen mesai farkı nedir?', a: '"Potansiyel" mesai henüz taslaktır — sistem algılamıştır ama siz talep etmediniz. "Talep Et" düğmesine bastığınızda "Bekleyen"e geçer ve yöneticiye gider. Sadece onaylanan mesai puantaja yansır.' },
            { q: 'Mesaim neden otomatik algılanmadı?', a: 'İki koşul sağlanmalıdır: (1) Geç kalma toleransını (30 dk) aşmanız, (2) Günlük toplam fazla mesai süresinin minimum eşiği (30 dk) geçmesi. Her iki koşul sağlanmazsa potansiyel mesai oluşmaz.' },
            { q: 'Haftalık OT limitim doldu, ne yapmalıyım?', a: 'Yöneticinizle konuşarak limitin güncellenmesini isteyebilirsiniz. Limit, çalışan profilinden (Çalışan Yönetimi > Ayarlar sekmesi) ayarlanabilir. Varsayılan 30 saat/hafta.' },
            { q: 'Vardiya öncesi erken giriş mesai sayılır mı?', a: 'Evet. Vardiyadan önce erken giriş yaptığınızda sistem bunu "Vardiya Öncesi" (PRE_SHIFT) potansiyel mesai olarak algılar ve talep edebilirsiniz.' }
        ]
    },
    {
        id: 'yemek-siparisi',
        title: 'Yemek Siparişi',
        icon: Utensils,
        description: 'Günlük yemek siparişi verme, sipariş durumu, personel adına talep ve toplu yönetim',
        permission: 'PAGE_MEAL_ORDERS',
        link: '/meal-orders',
        images: [
            { src: '/help-images/15-meal-orders.png', caption: 'Yemek Sipariş Yönetimi — tarih navigatörü, durum kartları (toplam/sipariş verilen/bekleyen/iptal), personel listesi ve işlemler' }
        ],
        steps: [
            {
                title: 'Tarih Seçimi ve Genel Bakış',
                description: 'Sayfanın üst kısmındaki tarih navigatöründen (ok butonları ile önceki/sonraki gün) hedef tarihi seçin. Özet kartlarında o güne ait toplam talep, sipariş verilen, bekleyen ve iptal edilen sayıları gösterilir.'
            },
            {
                title: 'Sipariş Durumu ve İşlemler',
                description: 'Her personelin yemek talebi bir satırda listelenir. "Sipariş Verildi / Geri Al" toggle butonu ile sipariş durumunu değiştirebilirsiniz. Not düzenle (kalem ikonu) ile ek bilgi girebilirsiniz. İptal (X ikonu) ile iptal sebebi girerek talebi iptal edebilirsiniz.'
            },
            {
                title: 'Personel Adına Talep Oluşturma',
                description: 'Sağ üst köşedeki "Personel Adına Talep Oluştur" butonuna tıklayın. Açılan modalda çalışan arayın (en az 2 karakter), seçin ve isteğe bağlı yemek açıklaması girin.',
                permission: 'PAGE_MEAL_ORDERS'
            },
            {
                title: 'Sipariş Durumu Akışı',
                description: 'Siparişler şu durum akışını izler: Bekliyor (amber) → Sipariş Verildi (yeşil, ✓) → Teslim Edildi (mavi, 📦) veya İptal Edildi (kırmızı, ⛔). "Sipariş Edildi" durumuna geçtikten sonra geri alınabilir.'
            }
        ],
        tips: [
            { type: 'info', text: 'Personel adına tıklama veya isim araması ile hızlıca talep bulabilirsiniz. Arama Türkçe karakterleri destekler.' },
            { type: 'warning', text: 'Bu sayfayı görmek için "Yemek Siparişi" yetkisi (PAGE_MEAL_ORDERS) gereklidir. Sayfayı göremiyorsanız sistem yöneticinize başvurun.' },
            { type: 'success', text: 'Yemek siparişleri de 2 mali ay geriye dönük pencere kuralına tabidir. Geçmiş tarihler için sipariş talebi oluşturabilirsiniz.' }
        ],
        faq: [
            { q: 'Sipariş verdikten sonra değiştirebilir miyim?', a: '"Sipariş Verildi" durumundayken "Geri Al" butonu ile bekleyen durumuna geri alabilirsiniz. İptal edilen talep geri açılamaz.' },
            { q: 'Yemek siparişi sayfasını göremiyorum', a: 'Bu sayfa PAGE_MEAL_ORDERS yetkisi gerektirir. Sistem yöneticinize başvurun.' }
        ]
    },
    {
        id: 'takvim',
        title: 'Takvim',
        icon: Calendar,
        description: 'Kişisel takvim, etkinlik filtreleri, ekip Gantt görünümü, mesai atamaları ve renk kodlu gün detayları',
        permission: null,
        link: '/calendar',
        images: [
            { src: '/help-images/08-calendar.png', caption: 'Takvim — aylık görünüm, sol panelde filtre toggle\'ları, sağda gün detay paneli, renk kodlu etkinlik noktacıkları' }
        ],
        steps: [
            { title: 'Takvim Gezinme', description: 'Sol paneldeki mini takvimden ay/yıl seçin. Önceki/sonraki ay okları ve "Bugün" butonu ile hızlı gezinme yapabilirsiniz. Haftasonu günleri amber/sarı, tatiller kırmızı, yarım gün tatiller diagonal çizgili arka planla gösterilir. Bugün mor çerçeve ile vurgulanır.' },
            { title: 'Etkinlik Filtreleri', description: 'Sol paneldeki toggle butonlarıyla hangi etkinlik türlerini göreceğinizi seçin: Ek Mesai Görevleri (mor), Ek Mesai Talepleri (amber), İzinler (cyan, varsayılan açık), Sağlık Raporları (pembe, varsayılan açık), Kartsız Girişler (turuncu), Ekip Görünümü (yöneticilere özel). Her filtre ayrı ayrı açılıp kapatılabilir.' },
            { title: 'Gün Detay Paneli', description: 'Herhangi bir güne tıkladığınızda sağ panelde o günün detayları görünür: tarih başlığı, etkinlik listesi (tip gruplarına ayrılmış), her etkinliğin başlık, saat aralığı, konum ve durum bilgileri. Kişisel etkinlikleriniz üzerinde hover yaparak düzenle/sil butonlarına erişebilirsiniz.' },
            { title: 'Etkinlik Oluşturma', description: '"Yeni Etkinlik" butonuna tıklayarak kişisel etkinlik oluşturun. Başlık, tarih/saat, tüm gün seçeneği, etkinlik türü (Kişisel/Toplantı/Hatırlatma), konum, görünürlük (Özel/Departman/Herkese Açık) ve renk ayarlarını yapın.' },
            { title: 'Etkinlik Noktacıkları', description: 'Takvim hücrelerinde her etkinlik türü için renkli küçük noktalar gösterilir (en fazla 4, fazlası +N olarak). Kişisel=mavi, Tatil=kırmızı, OT Ataması=violet, OT Talebi=amber, İzin=cyan, Dış Görev=mor, Sağlık Raporu=pembe, Kartsız Giriş=turuncu.' },
            { title: 'Ekip Görünümü (Yöneticiler)', description: '"Ekip Görünümü" filtresini açtığınızda ekibinizdeki çalışanların durumu gün detay panelinde listelenir: her üye için avatar, isim, departman ve durum badge\'leri (İzinli/Mesai/Rapor/Kartsız). Bu, ekip planlaması yaparken kimin müsait olduğunu hızlıca görmenizi sağlar.', permission: ['APPROVAL_OVERTIME', 'APPROVAL_LEAVE'] }
        ],
        tips: [
            { type: 'info', text: 'Etkinlik Görünürlüğü: "Özel" etkinlikler sadece size görünür. "Departman" etkinlikleri departmanınızdaki herkese, "Herkese Açık" etkinlikler tüm şirkete görünür.' },
            { type: 'info', text: 'Resmi tatiller ve yarım gün tatiller takvimde otomatik gösterilir. Yarım gün tatiller diagonal çizgili desenle ayırt edilir. Tatil günleri kırmızı arka plan alır.' },
            { type: 'success', text: 'Takvim verileri her 60 saniyede otomatik yenilenir. Sayfayı manuel yenilemenize gerek yoktur.' }
        ],
        faq: [
            { q: 'Takvimde başkasının etkinliğini görebilir miyim?', a: '"Departman" veya "Herkese Açık" görünürlükteki etkinlikleri görebilirsiniz. "Özel" etkinliklere erişilemez. Ekip Görünümü filtresini açarak ekibinizdeki izin ve mesai durumlarını takip edebilirsiniz.' },
            { q: 'Ek mesai atamasını takvimden yapabilir miyim?', a: 'Evet. Güne tıklayarak açılan detay panelinden, yönetici yetkisiyle ekibinizdeki çalışanlara ek mesai ataması yapabilirsiniz (Fazla Mesai görünüm modunda).' },
            { q: 'Neden bazı günler farklı renkte?', a: 'Haftasonu günleri amber/sarı, resmi tatiller kırmızı, yarım gün tatiller diagonal çizgili, bugün mor çerçeve ile gösterilir. Geçmiş günlerin opaklığı azaltılmıştır.' }
        ]
    },
    {
        id: 'sirket-rehberi',
        title: 'Şirket Rehberi',
        icon: Contact,
        description: 'Çalışan arama, anlık durum göstergesi, departman filtresi, kart/liste görünümü',
        permission: null,
        link: '/company-directory',
        images: [
            { src: '/help-images/05-company-directory.png', caption: 'Şirket Rehberi — çalışan kartları, durum göstergesi (Ofiste/İzinde/Dışarıda), 3 özet kartı, arama ve görünüm toggle\'ı' }
        ],
        steps: [
            {
                title: 'Özet Kartları ve Hızlı Filtreleme',
                description: 'Sayfanın üstünde 3 tıklanabilir özet kartı bulunur: Ofiste (yeşil), İzinde (turuncu), Dışarıda (gri). Karta tıklayarak o kategorideki çalışanları filtreleyebilirsiniz. Ayrıca alt kısımdaki pill butonlarla (Tümü/Ofiste/İzinde/Dışarıda) filtreleme yapılabilir.'
            },
            {
                title: 'Çalışan Arama',
                description: 'Arama kutusuna isim yazarak çalışan arayabilirsiniz. Sonuçlar 300ms gecikmeli olarak anlık filtrelenir.'
            },
            {
                title: 'Kart ve Liste Görünümü',
                description: 'Sağ üst köşedeki toggle butonlarıyla (Grid/Liste ikonları) görünüm değiştirebilirsiniz. Kart görünümünde: 2 harfli renkli avatar (ID bazlı 10 renk), durum noktası, tam ad, durum badge, e-posta ve telefon linkleri. Liste görünümünde: tablo formatında tüm bilgiler tek satırda.'
            },
            {
                title: 'Çalışan Durumları',
                description: 'Her çalışanın yanında anlık durum göstergesi: yeşil = Ofiste (giriş yapmış veya uzaktan çalışıyor), turuncu = İzinde, gri = Dışarıda (çıkış yapmış). Durum her 60 saniyede otomatik güncellenir. Ulaşılabilir çalışanlar yeşil "Ulaşılabilir" etiketi ile işaretlenir.'
            }
        ],
        tips: [
            { type: 'info', text: 'Çalışan kartına tıklayarak e-posta ve telefon linklerine doğrudan erişebilirsiniz. E-posta tıklandığında mail uygulamanız açılır, telefon tıklandığında arama başlatılır.' },
            { type: 'success', text: 'Rehber yalnızca aktif çalışanları gösterir. Pasif durumdaki (ayrılmış) çalışanlar listede görünmez.' },
            { type: 'info', text: 'Yenile butonu (sağ üst) ile verileri manuel olarak güncelleyebilirsiniz. Son güncelleme saati başlık altında gösterilir.' }
        ],
        faq: [
            { q: 'Çalışanın telefon numarasını göremiyorum', a: 'İletişim bilgileri çalışanın profil kayıtlarına bağlıdır. Bilgi girilmemişse görünmez. Kendi bilgilerinizi güncellemek için Profil > İletişim sekmesini kullanın.' },
            { q: 'Ayrılan bir çalışanı neden göremiyorum?', a: 'Şirket Rehberi yalnızca aktif çalışanları listeler. Ayrılmış (pasif) çalışanlar güvenlik nedeniyle rehberden çıkarılır.' }
        ]
    },
    {
        id: 'dilek-sikayetler',
        title: 'Dilek ve Şikayetler',
        icon: MessageSquare,
        description: 'Şikâyet, öneri ve teşekkür gönderme, dosya ekleme, takip etme ve yönetim yanıt paneli',
        permission: null,
        link: '/feedback',
        images: [
            { src: '/help-images/11-feedback.png', caption: 'Dilek ve Şikayetler — geri bildirim listesi, kategori rozetleri (Şikâyet/Öneri/Teşekkür), durum kartları ve yönetim sekmesi' }
        ],
        steps: [
            {
                title: 'Yeni Geri Bildirim Oluşturma',
                description: '"Yeni Geri Bildirim" düğmesine tıklayarak açılan modalda: (1) Kategori seçin — 3 butonlu grid: Şikâyet (kırmızı), Öneri (amber), Teşekkür (yeşil). (2) Başlık girin (max 200 karakter). (3) Açıklama yazın (metin alanı). (4) İsteğe bağlı dosya ekleyin (max 3 dosya, max 5MB/dosya, .jpg/.png/.pdf/.doc desteklenir). "Gönder" butonu ile talebi iletin.'
            },
            {
                title: 'Durum Takibi',
                description: '"Geri Bildirimlerim" sekmesinde gönderdiğiniz tüm geri bildirimlerin durumunu takip edebilirsiniz. Durum akışı: Beklemede (gri) → İnceleniyor (mavi) → Cevaplandı (yeşil) / Reddedildi (kırmızı) / Kapatıldı (gri). Her geri bildirimde kategori badge\'i ve durum badge\'i görünür.'
            },
            {
                title: 'Detay ve Cevap Görüntüleme',
                description: 'Geri bildirime tıklayarak detay modalını açın. Tam açıklama, eklenmiş dosyalar (indirme linki ile), yönetici cevabı ve durum bilgisi burada gösterilir.'
            },
            {
                title: 'Yönetim Paneli (Yöneticiler İçin)',
                description: 'Admin yetkisi olanlar "Tüm Geri Bildirimler" sekmesinde 4 alt sekme görür: Tümü, Cevaplanmamışlar, Onaylananlar, Reddedilenler. Her geri bildirimi inceleyebilir, cevap yazabilir ve durum güncelleyebilir.',
                permission: ['SYSTEM_FULL_ACCESS']
            }
        ],
        tips: [
            { type: 'info', text: 'Geri bildirimleriniz yalnızca yetkili yöneticiler ve sistem yöneticileri tarafından görüntülenebilir. Diğer çalışanlar sizin geri bildirimlerinize erişemez.' },
            { type: 'info', text: 'Dosya ekleme: Maksimum 3 dosya, her biri en fazla 5MB. Desteklenen formatlar: JPG, JPEG, PNG, PDF, DOC, DOCX. Dosya listesinde dosya adı, boyut ve silme butonu gösterilir.' },
            { type: 'warning', text: 'Silme işlemi kalıcıdır. Onay dialogu çıkar, geri bildirim başlığı gösterilir. Yanıtlanmış geri bildirimler kayıt bütünlüğü için silinemeyebilir.' },
            { type: 'success', text: 'Arama kutusunu kullanarak eski geri bildirimlerinizi konu veya içerik bazında hızlıca bulabilirsiniz.' }
        ],
        faq: [
            { q: 'Geri bildirimim kim tarafından görülüyor?', a: 'Geri bildirimleriniz yalnızca sistem yöneticileri ve yetkili yöneticiler tarafından görüntülenir. Diğer çalışanlar erişemez.' },
            { q: 'Dosya ekleyemiyorum, ne yapmalıyım?', a: 'Dosya boyutunun 5MB\'ı ve dosya sayısının 3\'ü aşmadığından emin olun. Desteklenen formatlar: JPG, JPEG, PNG, PDF, DOC, DOCX. Farklı formattaki dosyalar reddedilir.' }
        ]
    },
    {
        id: 'vekalet-yonetimi',
        title: 'Vekalet Yönetimi',
        icon: UserCheck,
        description: 'Yönetici vekâlet tanımlama, kapsamlı yetki devri, süre takibi ve otomatik sonlandırma',
        permission: null,
        link: '/substitute-management',
        images: [
            { src: '/help-images/12-substitute.png', caption: 'Vekâlet Yönetimi — 4 özet kartı (Toplam/Aktif/Gelecek/Süresi Dolmuş), verilen/vekil olunan sekmeler, durum renk kodları' }
        ],
        steps: [
            {
                title: 'Özet Kartları',
                description: 'Sayfanın üstünde 4 özet kartı: Toplam (gri), Aktif (yeşil — şu an geçerli), Gelecek (mavi — henüz başlamamış), Süresi Dolmuş (amber — bitmiş). Bu kartlar anlık vekâlet durumunuzu özetler.'
            },
            {
                title: 'Yeni Vekâlet Tanımlama',
                description: '"Yeni Vekâlet" bölümünü açarak: (1) Asıl Yönetici seçin (aranabilir dropdown), (2) Vekil Yönetici seçin (aranabilir dropdown — asıl ve vekil aynı kişi olamaz), (3) Başlangıç ve bitiş tarihi belirleyin (bitiş başlangıçtan önce olamaz), (4) Aktif durumunu işaretleyin. Kaydet butonu ile vekâleti oluşturun.'
            },
            {
                title: 'Vekâlet Kartı Bilgileri',
                description: 'Her vekâlet kartında: Asıl yönetici (mavi avatar) ve vekil (yeşil avatar) bilgileri, tarih aralığı ile ilerleme çubuğu (aktif vekâletlerde geçen süre yüzdesi), toplam gün sayısı, kalan gün göstergesi ve durum badge\'i gösterilir. Sol bordür rengi duruma göre değişir: yeşil=aktif, mavi=gelecek, amber=süresi dolmuş, gri=pasif.'
            },
            {
                title: 'Verdiğim / Vekil Olduğum Sekmeler',
                description: '"Verilen Vekâletler" sekmesinde oluşturduğunuz vekâletleri, "Benim Vekâletlerim" sekmesinde size verilen vekâlet yetkilerini görüntüleyin. Her kartta düzenle (kalem), sil (çöp) ve aktif/pasif toggle butonları bulunur.'
            }
        ],
        tips: [
            { type: 'info', text: 'Vekâlet süresi dolduğunda yetkiler otomatik olarak geri alınır. Manuel işlem gerekmez. Celery zamanlama görevi bu kontrolü periyodik olarak yapar.' },
            { type: 'warning', text: 'Vekâlet verdiğiniz kişi, sizin adınıza onay/red işlemi yapabilir. Yetkisiz onay riskini önlemek için güvendiğiniz kişileri seçin.' },
            { type: 'success', text: 'İzne çıkmadan önce vekâlet tanımlayın. Bu sayede ekibinizdeki taleplerin onay süreçleri aksamamış olur. Vekil tarafından yapılan tüm işlemler loglanır.' }
        ],
        faq: [
            { q: 'Vekâlet süresini uzatabilir miyim?', a: 'Evet. Düzenle (kalem) butonuna tıklayarak bitiş tarihini değiştirebilirsiniz.' },
            { q: 'Birden fazla kişiye vekâlet verebilir miyim?', a: 'Evet. Farklı kişilere farklı kapsamlarda vekâlet tanımlayabilirsiniz.' },
            { q: 'Vekil onayladığında kimin onayladığı görünür mü?', a: 'Evet. Vekil tarafından yapılan tüm işlemler loglanır. Talep detayında onaylayan kişi ve vekâlet bilgisi görünür.' }
        ]
    },
    {
        id: 'onay-surecleri',
        title: 'Onay Süreçleri',
        icon: CheckSquare,
        description: 'Talep onaylama/reddetme, gelen talepler sekmesi, onay hiyerarşisi ve toplu işlemler',
        permission: ['APPROVAL_OVERTIME', 'APPROVAL_LEAVE', 'APPROVAL_CARDLESS_ENTRY'],
        link: '/requests',
        images: [
            { src: '/help-images/10-requests.png', caption: 'Gelen Talepler sekmesi — bekleyen onay sayısı badge, talep listesi, onay/red butonları ve filtreler' }
        ],
        steps: [
            {
                title: 'Gelen Talepler Sekmesi',
                description: 'Talepler sayfasında "Gelen Talepler" sekmesine tıklayın (sekme yanındaki kırmızı badge bekleyen talep sayısını gösterir). Ekibinizden gelen bekleyen tüm talepler burada listelenir: izin talepleri, mesai talepleri, kartsız giriş talepleri ve dış görev talepleri.'
            },
            {
                title: 'Onay Hiyerarşisi',
                description: 'Sistem kademeli onay hiyerarşisi kullanır: (1) Birincil (PRIMARY) yönetici öncelikli kontrol edilir, (2) İkincil (SECONDARY) yönetici sadece OT işlemlerinde devreye girer, (3) Departman yöneticisi veya reports_to zinciri yukarı taranır. ApproverService 5 katmanlı çözümleme yapar: EmployeeManager → DepartmentAssignment → Department.manager → reports_to → dept hierarchy.'
            },
            {
                title: 'Talep İnceleme ve Onay/Red',
                description: 'Talep detayına tıklayarak çalışanın bilgilerini, tarih/saat detaylarını ve gerekçeyi inceleyin. "Onayla" (yeşil) veya "Reddet" (kırmızı) düğmelerine tıklayın. Red durumunda gerekçe yazmanız istenir. İşlem sonrası çalışana bildirim gönderilir.'
            },
            {
                title: 'Birincil / İkincil Yönetici Farkı',
                description: 'Birincil (PRIMARY) yönetici tüm talep türlerini (izin, mesai, kartsız giriş) görebilir ve onaylayabilir. İkincil (SECONDARY) yönetici sadece ek mesai (OT) işlemlerini görebilir — izin ve kartsız giriş talepleri ikincil yöneticiye gelmez.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Onaylanan talepler geri alınamaz. Lütfen onaylamadan önce detayları dikkatlice inceleyin. Yanlış onay durumunda sistem yöneticisine başvurun.' },
            { type: 'info', text: 'Onay yetkileriniz rolünüze bağlıdır: APPROVAL_OVERTIME (mesai onayı), APPROVAL_LEAVE (izin onayı), APPROVAL_CARDLESS_ENTRY (kartsız giriş onayı). Yalnızca atanmış yetkilerdeki talepleri görebilirsiniz.' },
            { type: 'info', text: 'Vekâlet sistemi aktifse, sizin adınıza vekil tayin ettiğiniz kişi de onay verebilir. Vekil tarafından yapılan işlemler ayrıca loglanır.' },
            { type: 'success', text: 'Üst menüdeki bildirim zili simgesinde bekleyen talep sayısı gösterilir. Bildirime tıklayarak doğrudan Gelen Talepler sekmesine gidebilirsiniz.' }
        ],
        faq: [
            { q: 'Bekleyen onayım var ama göremiyorum', a: 'Onay yetkinizi kontrol edin. APPROVAL_OVERTIME, APPROVAL_LEAVE veya APPROVAL_CARDLESS_ENTRY yetkilerinden en az birine sahip olmanız gerekir. Sistem yöneticinize başvurun.' },
            { q: 'Yanlışlıkla onay verdim, geri alabilir miyim?', a: 'Hayır. Onaylanan talepler doğrudan geri alınamaz. Düzeltme için sistem yöneticisine başvurun.' },
            { q: 'İkincil yöneticim mesai onaylamıyor?', a: 'İkincil (SECONDARY) yönetici sadece ek mesai işlemlerinde yetkilidir. İzin ve kartsız giriş talepleri birincil yöneticiye gider. İkincil yöneticinin APPROVAL_OVERTIME yetkisi olmalıdır.' }
        ]
    },
    {
        id: 'raporlar',
        title: 'Raporlar',
        icon: BarChart3,
        description: 'Aylık mutabakat raporu, mali dönem bazlı filtreleme, çalışma takvimi seçimi ve Excel/PDF dışa aktarma',
        permission: 'PAGE_REPORTS',
        link: '/reports',
        images: [
            { src: '/help-images/13-reports.png', caption: 'Raporlar — çalışma takvimi seçici, mali dönem filtresi, personel seçimi, rapor aralığı bilgi kutusu, Excel ve PDF indirme' }
        ],
        steps: [
            {
                title: 'Çalışma Takvimi Seçimi',
                description: 'Sayfanın üst kısmındaki dropdown\'dan çalışma takvimini (FiscalCalendar) seçin. Varsayılan takvim yıldız (★) ile işaretlenir. Seçtiğiniz takvim rapordaki hedef saatleri ve mali dönem sınırlarını belirler.'
            },
            {
                title: 'Mali Dönem ve Personel Filtresi',
                description: 'İkinci dropdown\'dan mali dönemi seçin. Kilitli dönemler kilit (🔒) ikonu ile gösterilir. "Personel" dropdown\'ından "Tüm Çalışanlar" veya belirli bir çalışan seçebilirsiniz. Seçimlerinize göre mavi bilgi kutusunda "Rapor Aralığı: [başlangıç] - [bitiş]" gösterilir.'
            },
            {
                title: 'Rapor İndirme',
                description: '"Excel İndir" (gri buton) veya "PDF İndir" (kırmızı buton) düğmelerinden birini tıklayın. Dosya otomatik olarak indirilir. İndirme sırasında buton "Hazırlanıyor..." olarak gösterilir ve tıklanamaz. Dosya adı formatı: Mesai_Raporu_[yıl]_[ay].xlsx/pdf.'
            },
            {
                title: 'Talep Analizleri',
                description: 'Detaylı talep analizleri için ayrı bir sayfa mevcuttur (/request-analytics). 10 bölüm: KPI kartları, aylık trend, dağılım grafikleri, ekip analizi, ek mesai analizi, izin analizi, fazla mesai-yemek korelasyonu, dolaylı talepler ve haftalık pattern ısı haritası.'
            }
        ],
        tips: [
            { type: 'info', text: 'Mali dönem 26-25 Türk bordro döngüsünü takip eder. "Şubat 2026 dönemi" = 26 Ocak – 25 Şubat. Rapor tarih filtreleri bu döneme göre çalışır.' },
            { type: 'success', text: 'Excel formatı detaylı veri analizi için, PDF formatı baskı ve paylaşım için uygundur. Her iki format da aynı veriyi içerir.' },
            { type: 'warning', text: 'Bu sayfa PAGE_REPORTS yetkisi gerektirir. Sayfayı göremiyorsanız sistem yöneticinize başvurun.' }
        ],
        faq: [
            { q: 'Rapor sayfasını göremiyorum', a: 'PAGE_REPORTS yetkisi gereklidir. Sistem yöneticinize başvurun.' },
            { q: 'Aylık çalışma bakiyesi nasıl hesaplanır?', a: 'MonthlyWorkSummary, mali dönem içindeki toplam çalışma süresinden hedef çalışma süresini çıkararak bakiye hesaplar. Pozitif = hedefin üstünde, negatif = eksik çalışma. Onaylanan ek mesailer bakiyeye dahildir.' }
        ]
    },
    {
        id: 'calisma-programlari',
        title: 'Çalışma Programları',
        icon: CalendarRange,
        description: 'Mali takvim, vardiya şablonları, yıllık takvim boyama, tatil tanımlama, dönem ayarları ve personel ataması',
        permission: 'PAGE_WORK_SCHEDULES',
        link: '/work-schedules',
        images: [
            { src: '/help-images/09-work-schedules.png', caption: 'Çalışma Programları — 5 sekmeli panel (Şablonlar/Yıllık Takvim/Tatiller/Dönemler & Ayarlar/Personel), şablon düzenleyici' }
        ],
        steps: [
            {
                title: 'Takvim Seçimi',
                description: 'Sayfanın üst çubuğunda mevcut mali takvimler (FiscalCalendar) listelenir. Çalışmak istediğiniz takvimi seçin. Her takvim farklı çalışma programlarını ve dönem ayarlarını barındırabilir.'
            },
            {
                title: 'Şablonlar Sekmesi',
                description: 'Sol panelde şablon listesi, sağ panelde seçili şablon düzenleyici (TemplateEditor) bulunur. "Yeni Şablon" butonu ile isim girerek yeni şablon oluşturun. Düzenleyicide: şablon adı, renk seçici, haftalık program (Pzt-Paz her gün başlangıç/bitiş veya "Tatil" toggle), öğle molası saatleri, günlük mola hakkı (dk), normal tolerans (dk), servis toleransı (dk), minimum OT eşiği (dk) ayarlarını yapın. "Varsayılan Yap" toggle\'ı ile bu şablonu varsayılan olarak atayın.'
            },
            {
                title: 'Yıllık Takvim (Boyama)',
                description: 'Yıl seçici ile hedef yılı belirleyin. Sol paletten bir şablon seçin (renkli kare). Takvim grid\'inde günlere tıklayarak o günü seçili şablonla "boyayın". Tarih aralığı seçerek toplu boyama (bulk_assign) yapabilirsiniz. "Silgi" ile mevcut atamayı kaldırın. Atanan günler şablon renginde gösterilir. Değişiklikler sonrası arka planda Celery ile yeniden hesaplama başlar — ilerleme çubuğu ile takip edin.'
            },
            {
                title: 'Tatiller Sekmesi',
                description: 'Özel tatil günleri tanımlayın: tarih, açıklama ve yarım gün checkbox. Tatil listesinden mevcut tanımları görüntüleyin veya silin. Bu tatiller tüm çalışanların takviminde otomatik gösterilir.'
            },
            {
                title: 'Dönemler & Ayarlar',
                description: 'Mali dönem listesi: her dönem başlangıç/bitiş tarihi, kilitli durumu (🔒) ve atanmış çalışan sayısı. Yeni dönem oluşturabilirsiniz. Kilitli dönemlerdeki puantaj kayıtları değiştirilemez.'
            },
            {
                title: 'Personel Sekmesi',
                description: 'Seçili takvime atanmış çalışanları görüntüleyin. Çalışan arama ve ekleme/kaldırma işlemleri yapabilirsiniz.'
            },
            {
                title: 'Program Öncelik Hiyerarşisi',
                description: 'Çalışanın belirli bir gündeki çalışma saatleri şu öncelikle belirlenir (en yüksekten en düşüğe): (1) Çalışan-düzeyi override → (2) DailyScheduleOverride (günlük değişiklik) → (3) DayTemplateAssignment (gün ataması) → (4) ScheduleTemplate (şablon) → (5) FiscalCalendar (mali takvim). En özel tanım geçerlidir.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Çalışma programı değişiklikleri tüm ilişkili puantaj kayıtlarının yeniden hesaplanmasını tetikler. Büyük kadrolarda bu işlem arka planda çalışır ve birkaç dakika sürebilir. İlerleme durumu sayfada gösterilir.' },
            { type: 'info', text: 'Tolerans Ayarları: Servis toleransı (varsayılan 0 dk) = servis kullanan personel için vardiya saatlerine yakın okutmaları yuvarlama. Normal tolerans (varsayılan 30 dk) = vardiya sonrası uzatma penceresi. Minimum OT eşiği (varsayılan 30 dk) = bu sürenin altındaki fazla mesai kaydedilmez.' },
            { type: 'success', text: 'Takvim değişikliklerinin geçmişi CalendarChangeLog\'da tutulur. Her değişikliğin ne zaman, kim tarafından yapıldığı ve önceki/sonraki değerleri kaydedilir.' }
        ],
        faq: [
            { q: 'Yeni vardiya şablonu nasıl oluştururum?', a: '"Yeni Şablon" düğmesine tıklayıp isim girin. Her gün için başlangıç-bitiş saatleri, tatil durumu, tolerans süreleri ve mola hakkını ayarlayın.' },
            { q: 'Takvim boyama nedir?', a: 'Yıllık Takvim sekmesinde şablon palettinden bir renk seçip günlere tıklayarak o günü o şablonla "boyarsınız". Toplu boyama ile tarih aralığı seçebilirsiniz.' },
            { q: 'Override şablondan öncelikli mi?', a: 'Evet. Öncelik: Çalışan override > Günlük değişiklik > Gün ataması > Şablon > Mali takvim.' }
        ]
    },
    {
        id: 'sistem-yonetimi',
        title: 'Sistem Yönetimi',
        icon: Shield,
        description: 'Sistem sağlığı, 30+ yönetim sekmesi, yetki denetimi, puantaj denetimi, testler ve şifre sıfırlama',
        permission: 'PAGE_SYSTEM_HEALTH',
        link: '/admin/system-health',
        images: [
            { src: '/help-images/17-system-health.png', caption: 'Sistem Kontrol Merkezi — 30+ sekmeli panel (Genel Bakış, Yetki Kontrolü, Stres Testi, Sistem Testleri, Loglar, Güvenlik vb.)' }
        ],
        steps: [
            {
                title: 'Genel Bakış',
                description: 'Canlı sistem ölçümleri: toplam çalışan, aktif mesai, devamsızlık oranı, bekleyen talepler. Sistem ayarları, veritabanı sağlığı, servis durumu ve son işlem logları. Üst başlıkta "SYSTEM ONLINE" yeşil göstergesi (yanıp sönen nokta) bulunur.'
            },
            {
                title: 'Yetki Denetimi (RBAC)',
                description: 'Birden fazla yetki sekmesi mevcuttur: "Yetki Kontrolü" (genel), "RBAC Denetimi" (uyumluluk), "RBAC Uyumluluk" (detaylı). Çalışanların atanmış rolleri, rollerin verdiği yetkiler, yetki çakışmaları ve etkili yetki hesaplamaları incelenir.'
            },
            {
                title: 'Mesai ve Puantaj Denetimi',
                description: '"Mesai Uyumluluk", "Mesai Denetimi", "OT Çalışan Analizi", "Kayıt Kontrol", "Mesai Doğrulama" gibi sekmelerle puantaj verilerini çok yönlü denetleyin. Tutarsızlıklar, hesaplama hataları ve eksik kayıtlar tespit edilir.'
            },
            {
                title: 'Veri Bütünlüğü Denetimi',
                description: '"Veri Bütünlüğü" sekmesinde 7 kategori taranır: OT çakışma, puantaj yeniden hesaplama, yetim talepler, süre tutarsızlığı, durum anomalisi, eksik puantaj, mali dönem bütünlüğü. Tarama + düzeltme modları mevcuttur.'
            },
            {
                title: 'Sistem Testleri ve Spec Testleri',
                description: '"Sistem Testleri" sekmesinde genel test suite\'i, "Spec Testleri" sekmesinde 52 aşamalı uyumluluk testi (Stage 1-52) çalıştırılır. Her aşama farklı bir modülü test eder. Test verisi oluşturma/temizleme ve tek aşama çalıştırma desteklenir.'
            },
            {
                title: 'Şifre Sıfırlama',
                description: '"Şifre Sıfırlama" sekmesinden tüm kullanıcıların şifrelerini toplu sıfırlayabilirsiniz. Sıfırlanan şifreler XLSX dosyası olarak indirilir. SYSTEM_FULL_ACCESS yetkisi gerektirir.',
                permission: 'SYSTEM_FULL_ACCESS'
            },
            {
                title: 'Tehlike Bölgesi',
                description: '"Sistem Sıfırlama" sekmesinde kritik işlemler bulunur: "Tüm Personeli Sil" gibi. Bu işlemler çift onay gerektirir (confirm dialog + "SIL" yazma). Son derece dikkatli kullanın.',
                permission: 'SYSTEM_FULL_ACCESS'
            }
        ],
        tips: [
            { type: 'warning', text: 'Sistem yönetimi araçları kritik işlemler içerir. Şifre sıfırlama ve veri silme geri alınamaz. SYSTEM_FULL_ACCESS yetkisi gerektirir.' },
            { type: 'info', text: 'Diğer önemli sekmeler: Stres Testi & Konsol, Servis Logları, Güvenlik, Mola Düzeltme, Sentetik Veri, Kaynak Kullanımı, Takvim Temizliği, Bakım & Onarım, Org Röntgen, Kalıntı Çalışanlar, Yönetici Yetki, Veri Tarayıcı, Doğum Günleri, E2E Testleri.' },
            { type: 'success', text: 'Spec testlerinde %100 oranı sistemin tam uyumlu olduğunu gösterir. Test sonuçları detaylı loglarla birlikte gösterilir.' }
        ],
        faq: [
            { q: 'Sistem sağlığı sayfasını göremiyorum', a: 'PAGE_SYSTEM_HEALTH yetkisi (SYSTEM_FULL_ACCESS rolü veya süper kullanıcı) gereklidir.' },
            { q: 'Test başarısız olursa ne yapmalıyım?', a: 'Başarısız testin detayına tıklayarak hata açıklamasını ve beklenen/gerçekleşen değerleri görün. Genellikle eksik ayar veya veri tutarsızlığından kaynaklanır.' }
        ]
    },
    {
        id: 'calisanlar',
        title: 'Çalışan Yönetimi',
        icon: Users,
        description: 'Çalışan listesi, 7 adımlı ekleme sihirbazı, profil düzenleme, rol/yetki atamaları, yönetici ilişkileri ve çalışma programı atama',
        permission: 'PAGE_EMPLOYEES',
        link: '/employees',
        images: [
            { src: '/help-images/04-employees-list.png', caption: 'Personel Yönetimi — departman/aktif-pasif filtreleri, arama kutusu, çalışan listesi tablosu ve "Yeni Personel Ekle" butonu' },
            { src: '/help-images/04-employee-create-step1.png', caption: 'Yeni Personel Ekleme — Adım 1: Kişisel Bilgiler formu (Ad, Soyad, TC, E-posta, Doğum Tarihi, Kullanıcı Adı, Şifre)' },
            { src: '/help-images/04-employee-create-step2.png', caption: 'Yeni Personel Ekleme — Adım 2: Kurumsal & Hiyerarşi (Sicil No, İşe Başlama, Yönetici Ataması, Etiketler, İkincil Görevler)' }
        ],
        steps: [
            {
                title: 'Çalışan Listesi',
                description: 'Çalışanlar sayfasında tüm personeli listeleyebilirsiniz. Üst kısımda: departman filtresi (dropdown), aktif/pasif durum filtresi ve isim arama kutusu. "Yeni Personel Ekle" butonu (mavi, + ikonu) ile ekleme sihirbazını başlatın. Liste her çalışan için isim, departman, pozisyon, takvim ve durum bilgisini gösterir.'
            },
            {
                title: 'Adım 1: Kişisel Bilgiler',
                description: 'Ad (zorunlu), Soyad (zorunlu), TC Kimlik No (hassas veri — SENSITIVE_DATA_CHANGE izni gerekli, kilit ikonu gösterilir), E-posta (zorunlu, email formatı), Doğum Tarihi (tarih seçici, hassas veri), Kullanıcı Adı (zorunlu — sisteme giriş için kullanılır), Şifre (anahtar ikonu — yetkili kullanıcı doldurur). Her zorunlu alan kırmızı yıldızla işaretlidir.'
            },
            {
                title: 'Adım 2: Kurumsal & Hiyerarşi',
                description: 'Personel Sicil No (zorunlu), İşe Başlama Tarihi (tarih seçici). Matris Organizasyon Yapısı uyarı kartı gösterilir. Birincil Yöneticiler bölümü: en az 1 birincil yönetici zorunlu — her satırda yönetici seçimi (dropdown), departman ve unvan seçimi bulunur. İlk birincil yöneticinin departman+unvanı çalışana otomatik atanır. İkincil Yöneticiler bölümü: isteğe bağlı, sadece OT işlemlerinde yetkili. Etiketler/Uzmanlıklar: renkli pill butonlar, çoklu seçim. İkincil Görevlendirmeler (Matrix): "Yeni Görev Ekle" butonu ile departman + pozisyon + yönetici satırı eklenir.'
            },
            {
                title: 'Adım 3: İletişim & Acil Durum',
                description: 'Cep Telefonu (telefon ikonu), İkinci Telefon, Adres (metin alanı), Acil Durum Kişisi: Ad Soyad + Telefon. Bu bilgiler Şirket Rehberi\'nde görünür.'
            },
            {
                title: 'Adım 4: Detaylar & Yetkinlik',
                description: 'Görev Tanımı Özeti (metin alanı), Çalışma Şekli dropdown (Tam Zamanlı / Uzaktan / Hibrit / Yarı Zamanlı / Saha). Hibrit veya Uzaktan seçildiğinde "Uzaktan Çalışma Günleri" toggle butonları görünür (Pzt-Paz). Çalışma Takvimi Planı: Mali Takvim seçimi (zorunlu dropdown) + seçilen takvimin tolerans ve mola değerleri otomatik gösterilir.'
            },
            {
                title: 'Adım 5: İzin Yönetimi',
                description: 'Yıllık İzin Bakiyesi (sayı girişi), Avans İzin Limiti, İzin Tahakkuk Oranı (varsayılan 14 gün). Bu değerler çalışanın izin hesaplamalarının temelini oluşturur.'
            },
            {
                title: 'Adım 6: Yetkilendirme',
                description: 'Roller: mevcut rollerin checkbox listesi — birden fazla rol atanabilir. Her rol belirli yetki kodları barındırır. Roller miras alınabilir (inheritance). Doğrudan İzinler: role ek olarak tek tek yetki kodu atama. Hariç Tutulan İzinler: miras alınan yetkileri kaldırma (exclusion).'
            },
            {
                title: 'Adım 7: Önizleme & Onay',
                description: 'Tüm adımlarda girilen bilgilerin özeti gösterilir. Her bölüm kartlar halinde listelenir. Hata olan adımlar kırmızı ile vurgulanır. "Personeli Kaydet" butonu ile çalışanı sisteme kaydedersiniz. Kayıt sonrası otomatik Django kullanıcı hesabı oluşturulur.'
            },
            {
                title: 'Çalışan Detay Sayfası',
                description: 'Çalışan listesinden bir çalışana tıklayarak detay sayfasını açın. 3 sekmeli yapı: (1) Kimlik & İletişim — ad, soyad, e-posta, telefon, TC, doğum tarihi, adres, acil durum. (2) Kurumsal & Organizasyon — departman, pozisyon, işe başlama, sicil no, yönetici atamaları (birincil + ikincil), ikincil görevlendirmeler. (3) Ayarlar & Yetkiler — profil düzenleme izni toggle, aktif/pasif toggle, servis kullanımı toggle, servis toleransı (dk), haftalık OT limiti (saat), çalışma programı, roller (checkbox listesi), şifre değiştirme.'
            },
            {
                title: 'Navigasyon İpuçları',
                description: 'Form sihirbazında: "Geri" ve "İleri" ok butonları ile adımlar arası geçiş, üstteki adım noktalarına tıklayarak herhangi bir adıma atlama. Hata olan adım kırmızı, tamamlanan adım yeşil nokta ile gösterilir. Adım noktasına tıklayarak doğrudan o adıma gidebilirsiniz.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Çalışan silme işlemi geri alınamaz ve ilişkili tüm kayıtları etkiler. Ayrılan personeli silmek yerine "Pasif" durumuna geçirmeniz şiddetle önerilir. Pasif durumuna geçirmek için detay sayfasında Ayarlar sekmesindeki "Aktif/Pasif" toggle\'ını kullanın.' },
            { type: 'info', text: 'Yönetici Ataması: İlk birincil yöneticinin departmanı ve pozisyonu otomatik olarak çalışana atanır. Yönetici değiştiğinde departman/unvan bilgisi güncellenebilir. İkincil yönetici sadece OT (ek mesai) işlemleri yapabilir — izin ve kartsız giriş talepleri ikincil yöneticiye gitmez.' },
            { type: 'info', text: 'TC kimlik numarası ve doğum tarihi hassas veri olarak sınıflandırılmıştır. Düzenlemek için SENSITIVE_DATA_CHANGE yetkisi gerekir. Kilit ikonu bu alanların korumalı olduğunu gösterir.' },
            { type: 'info', text: 'Admin koruma: Admin kullanıcının detay sayfasında kırmızı uyarı banner\'ı gösterilir. Admin profilini düzenlemek için SYSTEM_FULL_ACCESS yetkisi gerekir.' },
            { type: 'success', text: 'Çalışan listesini Excel olarak dışa aktarabilirsiniz. Dışa aktarma tüm aktif çalışanları ve seçili filtre kriterlerini içerir.' }
        ],
        faq: [
            { q: 'Yeni çalışan nasıl eklenir?', a: '"Yeni Personel Ekle" butonuna tıklayın. 7 adımlı form sihirbazı açılır: Kişisel Bilgiler → Kurumsal & Hiyerarşi → İletişim → Detaylar → İzin → Yetkilendirme → Önizleme. Kayıt sonrası çalışana otomatik Django kullanıcı hesabı oluşturulur.' },
            { q: 'Birincil ve ikincil yönetici farkı nedir?', a: 'Birincil (PRIMARY) yönetici doğrudan amirdir — tüm talep onaylarında (izin, mesai, kartsız giriş) yetkilidir. İkincil (SECONDARY) yönetici sadece ek mesai (OT) işlemlerinde yetkilidir. Birincil yönetici zorunlu (en az 1), ikincil isteğe bağlıdır.' },
            { q: 'Çalışanın yetkilerini nasıl kontrol ederim?', a: 'Detay sayfasında "Ayarlar & Yetkiler" sekmesinde atanmış rolleri görebilirsiniz. Her rolün verdiği yetki kodları listelenebilir. Etkili yetki hesaplaması miras alma ve dışlama kurallarını hesaba katar.' },
            { q: 'Çalışma takvimi nasıl atanır?', a: 'Adım 4\'te (yeni çalışan) veya detay sayfasında (mevcut çalışan) Mali Takvim dropdown\'ından takvim seçin. Takvim atanmadığında puantaj hesaplamaları çalışmaz.' },
            { q: 'Haftalık OT limiti nedir?', a: 'Her çalışanın haftalık fazla mesai limiti (varsayılan 30 saat). Detay sayfasının Ayarlar sekmesinden değiştirilebilir. Rolling 7 günlük pencerede ONAYLANMIŞ + BEKLEYEN mesai saatleri sayılır. Limit dolduğunda çalışan yeni mesai talebi oluşturamaz.' }
        ]
    },
    {
        id: 'organizasyon-semasi',
        title: 'Organizasyon Şeması',
        icon: Network,
        description: 'Departman hiyerarşisi, ağaç görünümü, sürükle-bırak, sağ tık menüsü ve çalışan detay popup\'ı',
        permission: 'PAGE_ORG_CHART',
        link: '/organization-chart',
        images: [
            { src: '/help-images/06-org-chart.png', caption: 'Organizasyon Şeması — hiyerarşik ağaç görünümü, zoom kontrolleri, renk kodlu düğümler ve çalışan bilgi popup\'ları' }
        ],
        steps: [
            {
                title: 'Organizasyon Görünümü',
                description: 'Şirketin departman yapısını ağaç görünümünde inceleyebilirsiniz. Her düğüm bir çalışanı temsil eder ve isim, unvan, departman ile çevrimiçi durumu gösterilir. Düğümler rol kategorisine göre renklendirilir: Mavi (Yazılım), İndigo (Mühendislik), Cyan (Teknik), Rose (Tasarım), Emerald (Satış), Amber (Finans), Violet (Sistem Yönetimi).'
            },
            {
                title: 'Kontroller ve Gezinme',
                description: 'Üst panelde: Yakınlaştır (ZoomIn), Uzaklaştır (ZoomOut), Ekrana Sığdır (Maximize) butonları. Görünüm toggle\'ı: Hiyerarşik (ağaç) veya Departman görünümü. Göster/Gizle seçenekleri: Pasif çalışanlar ve boş pozisyonlar. Fare tekerleği ile zoom, sürükleme ile pan yapılabilir.'
            },
            {
                title: 'Çalışan Detay Popup\'ı',
                description: 'Bir düğüme tıklayarak çalışan detay popup\'ını açın. Avatar, isim, unvan, canlı durum (Çevrimiçi/İzinde/Dışarıda + renkli nokta + giriş saati), birim, yönetici adı ve ikincil roller gösterilir. "Profili Gör" butonu ile çalışan yönetimi sayfasına gidebilirsiniz (PAGE_EMPLOYEES izni gerekir).'
            },
            {
                title: 'Sürükle-Bırak',
                description: 'Çalışan düğümlerini sürükleyerek organizasyon yapısını değiştirebilirsiniz. Taşıma işleminde onay dialogu çıkar: kaynak ve hedef gösterilir. Onay sonrası çalışanın raporlama zinciri güncellenir.'
            },
            {
                title: 'Sağ Tık Menüsü',
                description: 'Bir düğüme sağ tıklayarak bağlam menüsünü açın: Düzenle, Yeni Alt Çalışan Ekle, Departman Düzenle (departman adı, kısaltma, "Şemada Göster" checkbox), Departman Sil (boş departmanlar).'
            }
        ],
        tips: [
            { type: 'info', text: 'Organizasyon şeması çalışan profilleri ve departman atamalarından otomatik oluşturulur. Değişiklikler anında yansır.' },
            { type: 'warning', text: 'Tam görünüm PAGE_ORG_CHART yetkisi gerektirir. Sürükle-bırak ve düzenleme için yönetici izinleri gerekir.' },
            { type: 'success', text: '"Ekrana Sığdır" butonu tüm yapıyı ekrana sığdırır — büyük organizasyonlarda kullanışlıdır.' }
        ],
        faq: [
            { q: 'Organizasyon şeması nasıl güncellenir?', a: 'Şema otomatik olarak çalışan profilleri ve departman atamalarından üretilir. Sürükle-bırak ile de değişiklik yapılabilir.' },
            { q: 'Bir departmanın altına yeni birim nasıl eklenir?', a: 'Sağ tık menüsünden "Departman Düzenle" veya Veri Yönetimi sayfasından yeni departman oluşturun.' }
        ]
    },
    {
        id: 'servis-yonetimi',
        title: 'Servis Yönetimi',
        icon: Server,
        description: 'Puantaj hesaplama tetikleme, Celery görev durumu, canlı loglar, hızlı bağlantılar',
        permission: 'PAGE_SYSTEM_HEALTH',
        link: '/admin/service-control',
        images: [
            { src: '/help-images/14-service-control.png', caption: 'Servis Yönetimi — günlük hesaplama tetikleme (tarih seçici), sistem durumu paneli, hızlı bağlantılar ve canlı servis logları' }
        ],
        steps: [
            {
                title: 'Günlük Hesaplama Tetikleme',
                description: '"Günlük Hesaplama Tetikle" kartında hedef tarih seçerek (varsayılan: dün) o gün için tüm çalışanların puantaj hesaplamalarını yeniden başlatabilirsiniz. "Servisi Çalıştır" butonuna tıklayın. İşlem arka planda çalışır — başarı mesajı (yeşil) veya hata mesajı (kırmızı) gösterilir. Amber uyarı kutusu işlemin sürebileceğini bildirir.'
            },
            {
                title: 'Otomatik Görevler (Celery Tasks)',
                description: 'Sistem şu otomatik görevleri çalıştırır: Canlı güncelleme (her 30 sn), Devamsızlık kontrolü (her 30 sn), Gece görevi (00:01 — açık kayıtları kapatma, gece yarısı bölme, devamsızlık oluşturma), İzin tahakkuku (01:00), Mesai sona erme (01:30), Mali takvim uyarıları (09:00), Aylık mutabakat (26. gün, 09:00).'
            },
            {
                title: 'Sistem Durumu Paneli',
                description: '"Sistem Durumu" kartında büyük yeşil CheckCircle ile "Servis Aktif" gösterilir. Hızlı Bağlantılar: "Sistem Kontrol Merkezi" → /admin/system-health ve "Canlı Durum Paneli" → /admin/live-status.'
            },
            {
                title: 'Canlı Servis Logları',
                description: 'Sayfanın alt kısmında karanlık konsolda son 100 servis işleminin logları gösterilir. Her satırda: zaman damgası, seviye (INFO=mavi, WARN=sarı, ERROR=kırmızı), bileşen adı, mesaj ve çalışan adı. Loglar her 5 saniyede otomatik yenilenir.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Manuel hesaplama tetikleme çalışan sayısına bağlı olarak birkaç saniye ile birkaç dakika sürebilir. İşlem Celery task olarak arka planda çalışır.' },
            { type: 'info', text: 'Gece görevi (00:01): (1) OPEN kayıtları vardiya bitişinde kapatır, (2) Gece yarısını geçen kayıtları böler, (3) Gelmeyenler için devamsızlık oluşturur. Bu görev çalışmazsa ertesi gün kayıtlar tutarsız olabilir.' },
            { type: 'success', text: 'Loglar otomatik yenilenir. Hata logları kırmızı, uyarı logları turuncu renkte vurgulanır.' }
        ],
        faq: [
            { q: 'Hesaplama tetikledim ama kayıtlar değişmedi', a: 'Giriş/çıkış verisi yoksa hesaplama sonuç üretmez. Önce kartsız giriş talebi ile kayıtları oluşturun, sonra yeniden tetikleyin. Celery worker\'ın çalıştığından emin olun.' },
            { q: 'Gece görevi ne zaman çalışır?', a: 'Her gece 00:01\'de. İstanbul saat diliminde (Europe/Istanbul). Celery Beat scheduler tarafından tetiklenir.' }
        ]
    },
    {
        id: 'veri-yonetimi',
        title: 'Veri Yönetimi',
        icon: Database,
        description: 'Personel verileri, toplu işlemler, yıllık matris, JSON/CSV yedekleme ve içe aktarma',
        permission: 'PAGE_DATA_MANAGEMENT',
        link: '/system-data-management',
        images: [
            { src: '/help-images/18-data-management.png', caption: 'Veri Yönetimi — 4 sekmeli panel (Personel Verileri/Toplu İşlemler/Yıllık Matris/Yedekleme), filtreler ve detay görünümü' }
        ],
        steps: [
            {
                title: 'Personel Verileri Sekmesi',
                description: 'Çalışan arama ve seçme ile başlayın. Dönem (ay/yıl) filtresiyle hedef mali dönemi belirleyin. Seçilen çalışanın günlük puantaj kayıtları detaylı olarak gösterilir. DayEditPanel ile giriş/çıkış saatlerini düzenleyebilirsiniz. CalendarGrid ile aylık takvim görünümünde kayıtları inceleyebilirsiniz.'
            },
            {
                title: 'Toplu İşlemler Sekmesi',
                description: 'Toplu puantaj sıfırlama veya yeniden hesaplama işlemleri yapabilirsiniz. Tarih aralığı seçimi, çalışan/departman filtresi ve işlem türü seçimi. "Uygula" butonu + onay dialogu ile işlemi başlatın. Dikkatli kullanın — geri alınamaz.'
            },
            {
                title: 'Yıllık Matris Sekmesi',
                description: 'Tüm çalışanların 12 aylık çalışma bakiyelerini tek tabloda görüntüleyin. Her hücrede hedef saat, çalışılan, eksik ve OT bilgileri. Pozitif değerler (yeşil) = hedefin üstünde, negatif (kırmızı) = eksik çalışma. Hücreye tıklayarak Personel Verileri sekmesine geçiş yapabilirsiniz.'
            },
            {
                title: 'Yedekleme Sekmesi',
                description: 'JSON veya CSV formatında veri dışa aktarma: tam veri veya seçimli. İçe aktarma: JSON dosyası yükleme. UPSERT modu (mevcut güncelle, olmayan oluştur). Dry-run (deneme) simülasyonu — veritabanını değiştirmeden kaç kaydın etkileneceğini raporlar. Mutabakat (settlement) işlemi modalı da mevcuttur.'
            }
        ],
        tips: [
            { type: 'warning', text: 'İçe aktarma geri alınamaz. Mutlaka önce Deneme Modu (Dry Run) ile simülasyon çalıştırın. Doğrulama hataları detaylı gösterilir.' },
            { type: 'info', text: 'Matristeki değerler: Pozitif (yeşil) = hedefin üstünde çalışma, Negatif (kırmızı) = eksik çalışma. MonthlyWorkSummary modeli tarafından hesaplanır.' },
            { type: 'success', text: 'JSON dışa aktarma ile tüm puantaj verilerini yedekleyebilirsiniz. Aynı format ile içe aktarılabilir — round-trip veri bütünlüğü korunur.' }
        ],
        faq: [
            { q: 'Yıllık matriste "-6s" ne anlama geliyor?', a: 'O çalışanın o mali dönem için 6 saat eksik çalıştığı anlamına gelir.' },
            { q: 'Dışa aktarmada hangi veriler dahil?', a: 'Çalışan bilgileri, puantaj kayıtları, talep geçmişleri, rol/yetki atamaları ve mali takvim verileri. Format (JSON/CSV) seçilebilir.' },
            { q: 'İçe aktarma çakışmasında ne olur?', a: 'UPSERT modu: birincil anahtar eşleşirse günceller, eşleşmezse yeni oluşturur. Doğrulama hatası olan satırlar atlanır ve raporda gösterilir.' }
        ]
    },
    {
        id: 'saglik-raporlari',
        title: 'Sağlık Raporları',
        icon: HeartPulse,
        description: 'Sağlık raporu ve hastane ziyareti kayıtları, dosya yükleme, onay süreci, puantaj entegrasyonu',
        permission: 'PAGE_HEALTH_REPORTS',
        link: '/health-reports',
        images: [
            { src: '/help-images/16-health-reports.png', caption: 'Sağlık Raporları — rapor türü toggle (Sağlık Raporları/Hastane Ziyaretleri), 4 özet kartı, filtreler, liste ve detay modalı' }
        ],
        steps: [
            { title: 'Rapor Türü Seçimi', description: 'Sayfanın üstünde 2 toggle buton: "Sağlık Raporları" (HeartPulse, kırmızı) ve "Hastane Ziyaretleri" (Stethoscope, rose). Sağlık raporu = tam gün/çok günlü hastalık izni. Hastane ziyareti = belirli saatler arası (kısmi gün).' },
            { title: 'Özet Kartları ve Filtreler', description: '4 özet kartı: Toplam Rapor (gri), Onay Bekleyen (amber), Onaylanan (yeşil), Reddedilen (kırmızı). Filtreler: çalışan adı/açıklama araması (400ms debounce), durum dropdown (PENDING/APPROVED/REJECTED/CANCELLED), tarih aralığı (başlangıç/bitiş).' },
            { title: 'Rapor Detay Modalı', description: 'Listede "Gör" butonuna tıklayarak detay modalını açın. Çalışan adı, tarih aralığı, açıklama ve ekli dosyalar (indirme + silme) gösterilir. Düzenleme modunda: tarihler, açıklama ve yeni dosya ekleme. Aksiyonlar: "Onayla" (yeşil, ✓) — sadece PENDING durumdakiler, "Reddet" (kırmızı, ⛔) — ret sebebi modalı açılır, "Düzenle" (kalem).' },
            { title: 'Puantaj Etkisi', description: 'Onaylanan sağlık raporları ilgili günlerin puantaj kaydını HEALTH_REPORT veya HOSPITAL_VISIT durumuna geçirir. Bu günler çalışma hedefinden düşülür. Aylık çalışma özetinde (MonthlyWorkSummary) health_report_days ve hospital_visit_count ayrıca raporlanır.' }
        ],
        tips: [
            { type: 'info', text: 'Sağlık raporları aylık çalışma hedefinden düşülür. 3 günlük rapor = hedeften 3 × günlük saat düşülür. Bakiye hesabı doğru kalır.' },
            { type: 'warning', text: 'Dosya yüklemesi isteğe bağlıdır. Desteklenen formatlar: PDF, JPG, PNG. Dosyalar Cloudinary\'de güvenli saklanır.' },
            { type: 'success', text: 'Hastane ziyaretleri kısmi gün olarak işlenir — sadece belirtilen saatler çalışma süresinden düşülür. Tam gün rapor günün tamamını kapsar.' }
        ],
        faq: [
            { q: 'Sağlık raporu ile hastane ziyareti farkı?', a: 'Sağlık raporu = tam gün/çok günlü hastalık (doktor raporu). Hastane ziyareti = belirli saatler arası (kısmi gün). Her ikisi de puantaja yansır ama farklı kaynak kodlarıyla takip edilir.' },
            { q: 'Bu sayfayı göremiyorum', a: 'PAGE_HEALTH_REPORTS yetkisi gerekir. Genellikle ROLE_ADMIN ve ROLE_ACCOUNTING rollerine tanımlıdır.' }
        ]
    },
    {
        id: 'debug',
        title: 'Puantaj Hata Ayıklayıcı',
        icon: Server,
        description: 'Puantaj hesaplama doğrulama, veritabanı-canlı karşılaştırma, NaN tespiti ve ham kayıt analizi',
        permission: 'PAGE_DEBUG',
        link: '/debug/attendance',
        images: [
            { src: '/help-images/19-debug.png', caption: 'Puantaj Hata Ayıklayıcı — çalışan ve dönem seçici, kayıt analiz butonu, 3 sütunlu karşılaştırma ve ham kayıt tablosu' }
        ],
        steps: [
            { title: 'Çalışan ve Dönem Seçimi', description: 'Dropdown\'dan çalışan seçin. Ay (1-12) ve Yıl sayı girişleriyle mali dönemi belirleyin. "Kayıtları Analiz Et" butonu (indigo, Search ikonu) ile debug işlemini başlatın.' },
            { title: '3 Sütunlu Karşılaştırma', description: 'Sonuç 3 kolonda gösterilir: (1) Veritabanı Özeti — hedef, tamamlanan, eksik, toplam mola, son güncelleme. "NO_RECORD" ise kırmızı uyarı. (2) Canlı Hesaplama — hesaplama motorunun ürettiği değerler, DB ile karşılaştırma mesajı. (3) Yapılandırma — çalışma takvimi adı, dönem aralığı, izin sayısı.' },
            { title: 'Ham Günlük Kayıtlar', description: 'Alt tabloda o dönemin tüm günlük kayıtları listelenir. Sütunlar: Tarih, Toplam Sn, Normal (yeşil), Ek Mesai (mavi), Eksik (kırmızı), Mola (amber), Durum, Kaynak. Tutarsızlıklar kırmızı ile vurgulanır.' },
            { title: 'Hata Tespiti', description: 'NaN veya beklenmeyen değerler oluşmuşsa AlertTriangle ikonu ile işaretlenir. Hata mesajı ve stack trace gösterilir. Genellikle eksik vardiya tanımı veya bozuk veri kaynaklıdır.' }
        ],
        tips: [
            { type: 'info', text: 'Debug sayfası yalnızca okuma işlemi yapar — veritabanını değiştirmez. Düzeltme için Servis Yönetimi\'nden yeniden hesaplama tetikleyin.' },
            { type: 'warning', text: 'PAGE_DEBUG yetkisi gerektirir. Genellikle sadece sistem yöneticilerine açıktır.' }
        ],
        faq: [
            { q: 'Karşılaştırmada tutarsızlık çıktı', a: 'Servis Yönetimi\'nden ilgili tarih için "Günlük Hesaplama Tetikle" yapın. Hesaplama sonrası tutarsızlık düzelmelidir.' },
            { q: 'NaN değeri neden oluşur?', a: 'Çalışana atanmış çalışma programı (FiscalCalendar/ScheduleTemplate) eksik olduğunda veya vardiya saatleri tanımsız olduğunda oluşur. Çalışan profilinden takvim atamasını kontrol edin.' }
        ]
    },
    {
        id: 'mesai-takibi',
        title: 'Mesai Takibi (Ekip)',
        icon: Clock,
        description: 'Ekip çalışma durumu, liste/analitik/fazla mesai görünümleri, hiyerarşik sıralama ve OT ataması',
        permission: ['APPROVAL_OVERTIME', 'APPROVAL_LEAVE'],
        link: '/team',
        images: [
            { src: '/help-images/07-attendance.png', caption: 'Mesai Takibi — ekip listesi, çalışma/fazla mesai/eksik süre, çevrimiçi durum, dönem kontrolleri ve görünüm modları' }
        ],
        steps: [
            {
                title: '3 Görünüm Modu',
                description: 'Sağ üst köşede 3 toggle: (1) Liste — tablo görünümü, çalışanların çalışma detayları. (2) Analitik — TeamAnalyticsDashboard, detaylı ekip analiz grafikleri. (3) Fazla Mesai — OTAssignmentCreator, ekip üyelerine mesai ataması.'
            },
            {
                title: 'Ekip Sekmeleri ve Dönem',
                description: '"Birincil Ekip" sekmesi PRIMARY yöneticinin doğrudan raporlayanlarını, "İkincil Ekip" sekmesi SECONDARY ilişkileri gösterir (ikincil ekipte sadece OT bilgileri görünür). Yıl ve ay seçicileriyle dönem, departman filtresiyle belirli birim seçilebilir.'
            },
            {
                title: 'Özet Kartları ve Filtreler',
                description: '4 özet kartı: Toplam Çalışma, Toplam Fazla Mesai, Toplam Eksik, Net Bakiye (tüm ekip toplamları). Filtreler: isim/departman araması, durum filtresi (Tümü/Çevrimiçi/Geç Gelenler/Fazla Mesai/Eksik/Ortalamanın Üstü/Hedefin Altında), sıralama (Ad/Fazla Mesai/Eksik/Normal Çalışma/Net İyi/Net Kötü) ve hiyerarşik sıralama toggle\'ı.'
            },
            {
                title: 'Tablo Bilgileri',
                description: 'Her çalışan satırı: isim + unvan, departman, toplam çalışma, fazla mesai, eksik, bugün normal/fazla mesai, mola, giriş/çıkış saati, çevrimiçi durum (yeşil/kırmızı nokta). Satıra tıklayarak çalışan detayına gidebilirsiniz.'
            },
            {
                title: 'Hiyerarşi Görünümü',
                description: 'Hiyerarşik sıralama açıldığında ağaç yapısı gösterilir: GROUP düğümleri (rol grubu başlığı + toplam istatistikler) altında çalışan satırları. Her düğüm genişletilebilir/daraltılabilir. GROUP düğümleri toplu istatistik gösterir.'
            },
            {
                title: 'Analitik Modu',
                description: 'TeamAnalyticsDashboard: katılım oranı, hafta sonu/hafta içi OT analizi, yemek-OT korelasyonu, izin kullanım oranları, departman benchmark tablosu, ranking tablosu ve PersonDetailDrawer (tıklanan çalışanın detaylı katılım + OT + yemek bölümleri).'
            }
        ],
        tips: [
            { type: 'info', text: 'Yönetici yetkisi (APPROVAL_LEAVE veya APPROVAL_OVERTIME veya subordinate ilişkisi) gereklidir. Bu sayfayı göremiyorsanız yönetici rolünüz tanımlanmamış olabilir.' },
            { type: 'info', text: 'İkincil ekip sekmesi sadece OT bilgilerini gösterir. İkincil yönetici izin ve puantaj detaylarına erişemez — sadece ek mesai işlemleri yapabilir.' },
            { type: 'success', text: 'Vekâlet devri aktifse "Vekil Ekip" toggle\'ı ile vekalet verilen yöneticinin ekibini de görebilirsiniz.' }
        ],
        faq: [
            { q: 'Ekip listesini göremiyorum', a: 'Yönetici ilişkiniz (PRIMARY veya SECONDARY) veya onay yetkiniz (APPROVAL_LEAVE/OVERTIME) olmalıdır. Sistem yöneticinize başvurun.' },
            { q: 'Hiyerarşik sıralama nedir?', a: 'Çalışanları yönetici ağacına göre sıralar. GROUP düğümleri altında o grubun toplam çalışma, fazla mesai ve eksik istatistikleri gösterilir. Büyük ekiplerde yapıyı anlamayı kolaylaştırır.' }
        ]
    },
    {
        id: 'program-yonetimi',
        title: 'Program Yönetimi',
        icon: Package,
        description: 'Harici yazılım envanteri, API anahtarı yönetimi, HWID bazlı cihaz erişim kontrolü',
        permission: 'PAGE_PROGRAM_MANAGEMENT',
        link: '/program-management',
        images: [
            { src: '/help-images/20-program-management.png', caption: 'Program Yönetimi — 3 özet kartı (Toplam/Aktif Program/Kayıtlı Cihaz), sol panel program listesi, sağ panel detay ve erişim logları' }
        ],
        steps: [
            {
                title: 'Program Listesi ve Özet',
                description: '3 özet kartı: Toplam Program (mavi), Aktif Program (yeşil), Kayıtlı Cihaz (mor). Sol panelde program listesi — her kart program adı, aktif/pasif durumu ve son erişim saatini gösterir. Tıklayarak sağ panelde detay açılır.'
            },
            {
                title: 'Yeni Program Ekleme',
                description: '"Yeni Program" butonu (mavi, +) ile CreateProgramModal açılır. Program adı, açıklama ve aktif durumunu girip oluşturun.'
            },
            {
                title: 'Program Detayı ve API Anahtarı',
                description: 'Sağ panelde: API Anahtarını Göster/Gizle (göz ikonu), Kopyala (copy ikonu), Anahtarı Yenile (onay dialogu — "Dikkat! Tüm bağlantılar kesilir"), Sil (onay dialogu), Aktif/Pasif toggle. Detay içi 3 alt sekme: Cihazlar (erişim listesi), Kullanıcılar, Dokümantasyon.'
            },
            {
                title: 'Cihaz Erişim Yönetimi (HWID)',
                description: '"Cihazlar" sekmesinde HWID bazlı cihaz listesi: cihaz adı, HWID parmak izi, son erişim tarihi, durum ve aktif/pasif toggle. Erişim log renkleri: SUCCESS (yeşil), INVALID_KEY/CREDENTIALS/HWID_BLOCKED (kırmızı), VERSION_REJECTED/HWID_LIMIT (turuncu), PROGRAM_INACTIVE (sarı).'
            }
        ],
        tips: [
            { type: 'info', text: 'Sol listeden program seçerek sağ panelde tüm detayları (cihaz listesi, API anahtarı, erişim logları) görüntüleyebilirsiniz.' },
            { type: 'warning', text: 'Program silme ilişkili tüm cihaz kayıtlarını kalıcı olarak kaldırır. Kullanılmayan programları "Pasif" durumuna geçirmeyi tercih edin.' },
            { type: 'warning', text: 'API anahtarını yenilemek tüm mevcut bağlantıları keser. Bu işlem geri alınamaz.' }
        ],
        faq: [
            { q: 'Bu sayfayı göremiyorum', a: 'PAGE_PROGRAM_MANAGEMENT yetkisi gerekir. Sistem yöneticinize başvurun.' },
            { q: 'Silinen programın cihaz kayıtları geri gelir mi?', a: 'Hayır. Program ve ilişkili cihaz kayıtları kalıcı olarak silinir.' }
        ]
    }
];

export default helpContent;
