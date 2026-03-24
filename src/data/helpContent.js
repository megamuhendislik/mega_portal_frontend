import {
    Clock, CalendarDays, Timer, Utensils, Calendar,
    Contact, CheckSquare, BarChart3, CalendarRange, Shield,
    Users, Network, Server, Database, Package,
    MessageSquare, UserCheck, HeartPulse, Gift, Bug
} from 'lucide-react';

const helpContent = [
    {
        id: 'giris-cikis',
        title: 'Ana Sayfa ve Giriş/Çıkış',
        icon: Clock,
        description: 'Kart okutma ile giriş/çıkış, canlı durum takibi, mola hesaplama, haftalık ek mesai limiti ve aylık performans özeti. (Tüm çalışanlar görebilir)',
        permission: null,
        link: '/',
        images: [
            { src: '/help-images/help-login-01.png', caption: 'Giriş sayfası — kullanıcı adı ve şifre ile oturum açma' },
            { src: '/help-images/help-giris-01.png', caption: 'Ana sayfa tam görünüm — özet kartları, puantaj grafiği, son aktiviteler ve yaklaşan etkinlikler' },
            { src: '/help-images/help-giris-02.png', caption: 'Ana sayfa üst kartlar — bugün çalışma, mola, fazla mesai, izin durumu ve haftalık limit' },
            { src: '/help-images/help-giris-03.png', caption: 'Puantaj grafiği bölgesi — günlük çalışma süreleri ve hedef çizgisi' },
            { src: '/help-images/help-giris-04.png', caption: 'Aylık performans bölgesi — hedef, gerçekleşen, bakiye ve dönem detayları' }
        ],
        steps: [
            {
                title: 'Kart Okutma ile Giriş Yapma',
                description: 'İşe geldiğinizde kartınızı kart okuyucu cihaza okutun. Sistem giriş saatinizi otomatik kaydeder ve mesainiz başlar. Servis kullanıcıları için giriş saati vardiya başına yuvarlanır.',
                image: { src: '/help-images/help-giris-01.png', caption: 'Ana sayfa — giriş sonrası görünüm' }
            },
            {
                title: 'Canlı Durum Kartları',
                description: 'Ana sayfanın üst kısmında 5 özet kartı bulunur: Bugün Çalışma (toplam süre), Kalan Mola (kullanılan/hak), Fazla Mesai (onaylanan/bekleyen), İzin Durumu (yıllık ve mazeret bakiyesi), Doğum Günü İzni (sadece doğum ayınızda görünür). Veriler her 60 saniyede otomatik güncellenir.'
            },
            {
                title: 'Haftalık Ek Mesai Limiti',
                description: 'Özet kartlarının altında haftalık ek mesai limit çubuğu yer alır. Son 7 günlük pencerede onaylanmış ve bekleyen mesai toplamını gösterir. Renk kodları: yeşil (%0-70), turuncu (%70-90), kırmızı (%90-100). Limit dolduğunda yeni talep oluşturulamaz.'
            },
            {
                title: 'Mola Takibi',
                description: 'Gün içinde her çıkış-giriş arası "potansiyel mola" olarak hesaplanır. Üst menu çubuğundaki kahve simgesi ile anlık mola durumunuzu görebilirsiniz. Mola hakkınızı aşarsanız aşın kısım çalışma sürenizden düşülür ve kırmızı uyarı gösterilir.'
            },
            {
                title: 'Çıkış Yapma',
                description: 'Mesai bitiminde kartınızı tekrar okutun. Çıkış yapmazsanız kaydınız gece yarısı otomatik görevle kapatılır ve yanlış potansiyel mesai oluşabilir. Unutursanız "Kartsız Giriş Talebi" ile düzeltme yapabilirsiniz.'
            },
            {
                title: 'Aylık Performans Özeti',
                description: 'Ana sayfanın alt bölümünde aylık performans döngüsü bulunur. Her mali dönem için hedef çalışma süresi, gerçekleşen süre, bakiye (fark), onaylı mesai, izin ve sağlık raporu günleri gösterilir. Sol/sağ oklarla aylar arasında gezinebilirsiniz.'
            }
        ],
        tips: [
            { type: 'info', text: 'Tolerans Türleri: Sistemde 3 bağımsız tolerans mekanizması vardır: (1) Servis Toleransı — sadece servis kullananlar için giriş/çıkış yuvarlama. (2) Normal Tolerans (30 dk) — vardiya sonrası uzatma penceresi, önce mesai eksiği kapatılır. (3) Minimum Eşiği (30 dk) — günlük toplam mesai bu eşiğin altındaysa sıfırlanir.' },
            { type: 'warning', text: 'Çıkış yapmadan ayrılmayın! Kaydınız açık kalır ve gece yarısı otomatik görevle kapatılır. Bu sahte potansiyel mesai ve yanlış puantaj oluşturabilir.' },
            { type: 'success', text: 'Kartınızı unuttuysanız Talepler sayfasından "Kartsız Giriş Talebi" oluşturun. Geçmiş 2 mali ay içindeki tarihler için verilebilir.' },
            { type: 'info', text: 'Veriler her 60 saniyede otomatik güncellenir. Tarayıcı sekmenizi kapattığınızda güncellemeler durur, tekrar açtığınızda anında yenilenir.' }
        ],
        faq: [
            { q: 'Kart okutmayı unuttum, ne yapmalıyım?', a: 'Talepler sayfasından "Kartsız Giriş Talebi" oluşturun. Giriş/çıkış saatlerinizi belirtin, talep birincil yöneticinize gider. Onaylandığında puantaj kaydınız otomatik oluşturulur.' },
            { q: 'Gece mesai yaptım, kayıtlarım nasıl hesaplanır?', a: 'Gece 00:00\'i geçen kayıtlar gece yarısı otomatik görevi ile bölünür. Kaydınız 23:59:59\'da kapatılır ve ertesi gün için yeni kayıt oluşturulur.' },
            { q: 'Mola süremin neden aştığını gösteriyor?', a: 'Gün içindeki tüm çıkış-giriş aralıkları mola olarak sayılır. Günlük mola hakkı (genellikle 30 dk) aşıldığında, aşın kısım net çalışma sürenizden düşülür.' },
            { q: 'Fazla mesai nasıl algılanır?', a: 'Vardiya sonrasında (tolerans süresi sonra), vardiya öncesinde (erken giriş) veya tatil gününde çalıştığınızda otomatik potansiyel mesai oluşur. Günlük toplam 30 dk eşiğin altındaysa kayıt oluşturulmaz.' },
            { q: 'Aylık bakiye negatif görünüyor, ne anlama geliyor?', a: 'O mali dönemde hedef çalışma süresinin altında kaldığınızı gösterir. Geç kalmalar, erken çıkışlar veya eksik günlerden kaynaklanabilir.' },
            { q: 'Yönetici ana sayfası farklı mı?', a: 'Evet. Yöneticiler ek olarak ekip özet kartları, bekleyen onay sayacı ve hızlı işlem düğmeleri görür.' }
        ]
    },
    {
        id: 'profil',
        title: 'Profilim',
        icon: Users,
        description: 'Kişisel bilgiler, iletişim, bildirim tercihleri ve şifre yönetimi. (Tüm çalışanlar görebilir)',
        permission: null,
        link: '/profile',
        images: [
            { src: '/help-images/help-profil-01.png', caption: 'Kişisel Bilgiler sekmesi — ad, soyad, e-posta, TC kimlik, doğum tarihi alanları' },
            { src: '/help-images/help-profil-02.png', caption: 'İletişim sekmesi — telefon, adres ve acil durum kişi bilgileri' },
            { src: '/help-images/help-profil-03.png', caption: 'Bildirimler sekmesi — bildirim tercih açma/kapama düğmeleri' },
            { src: '/help-images/help-profil-04.png', caption: 'Güvenlik sekmesi — şifre değiştirme formu' }
        ],
        steps: [
            {
                title: 'Profil Sayfasina Erişim',
                description: 'Sol menüden "Profilim" seçeneğine veya sağ üst köşedeki avatar simgesine tıklayarak profil sayfanıza ulaşın. Sayfa sol panel (avatar, ad, departman, sicil no) ve sağ panel (4 sekme) olarak düzenlenmiştir.',
                image: { src: '/help-images/help-profil-01.png', caption: 'Kişisel Bilgiler sekmesi' }
            },
            {
                title: 'Kişisel Bilgiler Sekmesi',
                description: 'Ad ve soyad salt okunurdur (yönetici günceller). E-posta düzenlenebilir. TC Kimlik No maskelenmiş gösterilir (KVKK koruması). Doğum tarihi ve telefon düzenlenebilir.',
                image: { src: '/help-images/help-profil-01.png', caption: 'Kişisel bilgi alanları' }
            },
            {
                title: 'İletişim Sekmesi',
                description: 'İkinci telefon, adres ve acil durum iletişim bilgilerini (kişi adı + telefon) yönetebilirsiniz. Acil durum bilgileri iş güvenliği açısından önemlidir.',
                image: { src: '/help-images/help-profil-02.png', caption: 'İletişim bilgileri' }
            },
            {
                title: 'Bildirimler Sekmesi',
                description: '7 farklı bildirim türünü açma/kapama düğmeleri ile yönetin: izin onay/red, mesai onay/red, vekalet talepleri, eskalasyon uyarıları ve sistem duyuruları. Tercihiniz anında kaydedilir.',
                image: { src: '/help-images/help-profil-03.png', caption: 'Bildirim tercihleri' }
            },
            {
                title: 'Güvenlik Sekmesi',
                description: 'Eski şifre, yeni şifre ve onay alanlarıyla şifrenizi değiştirin. En az 6 karakter gereklidir. Sistem yöneticisi şifrenizi sıfırladiysa ilk girişte bu sekmeye yönlendirilirsiniz.',
                image: { src: '/help-images/help-profil-04.png', caption: 'Şifre değiştirme formu' }
            }
        ],
        tips: [
            { type: 'info', text: 'Ad, soyad, departman, pozisyon ve sicil numarası yönetici tarafından Çalışan Yönetimi sayfasından güncellenir. Profil sayfanizda bu alanlar salt okunurdur.' },
            { type: 'warning', text: 'Önemli bildirimleri (izin ve mesai onay/red) kapatmamaniz önerilir. Aksi halde talep durumunuzdaki değişikliklerden habersiz kalabilirsiniz.' },
            { type: 'info', text: 'TC kimlik numarası KVKK kapsamında hassas veri olarak sınıflandırılmıştır. Ekranda maskelenmiş gösterilir, düzenleme için özel yetki gerekir.' }
        ],
        faq: [
            { q: 'Departman veya pozisyon bilgimi nasıl değiştiririm?', a: 'Bu bilgiler yönetici tarafından Çalışan Yönetimi sayfasından güncellenir. İK birimine veya yöneticinize başvurun.' },
            { q: 'Şifremi unuttum, ne yapmalıyım?', a: 'Sistem yöneticinize başvurun. Şifreniz sıfırlanir ve ilk girişte yeni şifre belirlemeniz istenir. Şifre sıfırlama süreci XLSX dosyası olarak yöneticiye iletilir.' },
            { q: 'TC kimlik numaram neden kilitli görünüyor?', a: 'KVKK kapsamında hassas veridir. Düzenlemek için SENSITIVE_DATA_CHANGE yetkisine sahip bir yönetici işlem yapmalıdır.' },
            { q: 'Fotoraf yükleyebilir miyim?', a: 'Su an profil fotoğrafı yükleme desteklenmemektedir. Avatar, adinizin ve soyadinizin bas harflerinden otomatik oluşturulur.' }
        ]
    },
    {
        id: 'izin-talepleri',
        title: 'İzin Talepleri',
        icon: CalendarDays,
        description: 'Yıllık izin, mazeret izni, doğum günü izni, avans izin başvurusu, bakiye takibi ve onay süreçleri. (Tüm çalışanlar görebilir)',
        permission: null,
        link: '/requests',
        images: [
            { src: '/help-images/help-talepler-01.png', caption: 'Kendi Taleplerim sekmesi — izin talep listesi, durum süzgeçleri ve yeni talep oluşturma düğmesi' },
            { src: '/help-images/help-talepler-05.png', caption: 'Yeni talep oluşturma penceresi — izin türü seçimi ve tarih aralığı' }
        ],
        steps: [
            {
                title: 'İzin Bakiyesi Kontrolu',
                description: 'Talep oluşturmadan önce bakiyenizi kontrol edin. Ana sayfadaki "İzin Durumu" kartında yıllık izin (gun) ve mazeret izni (saat) bakiyesi özetlenir. Talepler sayfasında daha detayli bilgi bulabilirsiniz.',
                image: { src: '/help-images/help-talepler-01.png', caption: 'Kendi taleplerim ve bakiye bilgileri' }
            },
            {
                title: 'Yeni İzin Talebi Oluşturma',
                description: '"Kendi Taleplerim" sekmesinden "Yeni Talep" düğmesine tıklayın. Açılan pencerede izin türünü seçin, başlangıç/bitiş tarihlerini belirleyin, açıklama yazın. "Gönder" ile talebi oluşturun.'
            },
            {
                title: 'İzin Türleri',
                description: 'Yıllık izin (kıdeme gore 14-26 gun), mazeret izni (yıllık 18 saat, günlük max 4.5 saat), doğum günü izni (doğum ayında kullanılır), yasal izinler (evlilik, doğum, olum vb.) ve avans izin (bakiye negatife düşebilir) bulunur.'
            },
            {
                title: 'Onay Süreci',
                description: 'Talep otomatik olarak birincil yöneticinize yönlendirilir. Birincil yönetici bulunamazsa departman yöneticisi veya üst hiyerarşi devreye girer. Onay/red sonrası bildirim alırsiniz.'
            },
            {
                title: 'İptal ve Bakiye Iadesi',
                description: 'Bekleyen talebi kendiniz iptal edebilirsiniz. Onaylanmış talepler için sistem yöneticisine başvurun. İptal durumunda bakiye otomatik iade edilir.'
            },
            {
                title: 'Avans İzin Kullanımı',
                description: 'Yıllık izin bakiyeniz yetersizse "Avans İzin" seçeneğini kullanabilirsiniz. Avans izin, henüz hak etmediğiniz izin günlerini önceden kullanmanızı sağlar. Bakiyeniz negatife düşebilir. Avans limiti çalışan bazında tanımlanır (varsayılan: yıllık hakkın yarısı).'
            }
        ],
        tips: [
            { type: 'info', text: 'Bakiye düşümü "İlk Hak Edilen, İlk Düşülür" yontemiyle çalışır. En eski dönemdeki izin hakkı önce kullanılır, boylece devir izinleri doğrutakip edilir.' },
            { type: 'info', text: 'Mazeret izni saat bazli çalışır. Yıllık 18 saat hak, günlük en fazla 4.5 saat. Her yil 1 Ocak\'ta otomatik sıfırlanir.' },
            { type: 'warning', text: 'Geçmiş tarihler için izin talebi 2 mali ay geriye dönük pencere kuralıyla sınırlıdir. Kilitli dönemlerdeki tarihler için talep oluşturulamaz.' },
            { type: 'success', text: 'Onaylanan izinler takvimde otomatik gösterilir ve bakiyenizden düşülür.' }
        ],
        faq: [
            { q: 'İzin bakiyem neden negatif?', a: 'Avans izin kullandiginizda bakiye negatife düşer. Henuz hak etmediginiz günleri önceden kullandiginizi gösterir.' },
            { q: 'Onaylanmış iznimi iptal edebilir miyim?', a: 'Kendiniz iptal edemezsiniz. Sistem yöneticisine başvurmaniz gerekir. İptal sonrası bakiye otomatik iade edilir.' },
            { q: 'Mazeret iznimin saat bakiyesini nerede görebilirim?', a: 'Ana sayfadaki turuncu izin kartında ve talepler sayfasında detayli olarak görürsünüz.' },
            { q: 'İzin talebim kime gidiyor?', a: 'Birincil yöneticinize otomatik yönlendirilir. İkincil yönetici izin taleplerine yetkili değildir, sadece ek mesai işlemleri için yetkilidir.' }
        ]
    },
    {
        id: 'kartsiz-giris',
        title: 'Kartsız Giriş Talebi',
        icon: Contact,
        description: 'Kart okutmayı unuttuğunuzda veya kart okuyucu arızalandığında geriye dönük puantaj düzeltme talebi. (Tüm çalışanlar görebilir)',
        permission: null,
        link: '/requests',
        images: [
            { src: '/help-images/help-talepler-05.png', caption: 'Yeni talep oluşturma penceresi — talep türü seçimi' },
            { src: '/help-images/help-talepler-01.png', caption: 'Kendi taleplerim listesi — tüm taleplerin durumu' }
        ],
        steps: [
            {
                title: 'Yeni Talep Oluşturma',
                description: 'Sol menüden "Talepler" sayfasına gidin. "Yeni Talep" düğmesine tıklayın. Açılan pencereden "Kartsız Giriş" türünü seçin.'
            },
            {
                title: 'Tarih ve Saat Bilgisi Girme',
                description: 'Kartsız giriş yapmak istediğiniz tarihi seçin. Giriş saati ve çıkış saatini belirtin. Tarih, geçmiş 2 mali ay (yaklaşık 60 gün) içinde olmalıdır. Tatil ve hafta sonu günleri için kartsız giriş talebi kabul edilmez.'
            },
            {
                title: 'Açıklama ve Gönderim',
                description: 'Neden kart okutamadığınızı açıklama alanına yazın (örn: "Kartımı evde unuttum", "Kart okuyucu arızalıydı"). "Gönder" düğmesine basın. Talep birincil yöneticinize iletilir.'
            },
            {
                title: 'Onay Sonrası',
                description: 'Yöneticiniz talebi onayladığında, belirttiğiniz saatlerle otomatik olarak puantaj kaydı oluşturulur ve günlük hesaplama yeniden tetiklenir. Reddedilirse, bildirim alırsınız ve puantajınızda değişiklik olmaz.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Kartsız giriş talebi sadece çalışma programınızda iş günü olan tarihler için verilebilir. Tatil ve hafta sonu günleri otomatik reddedilir.' },
            { type: 'info', text: 'Geçmiş 2 mali ay dışındaki tarihler için talep oluşturamazsınız. Mali dönem kuralı: her ayın 26sından bir sonraki ayın 25ine kadardır.' },
            { type: 'success', text: 'Onaylanan kartsız giriş talebi, gerçek kart okutmayla aynı etkiyi yapar. Puantajınız otomatik güncellenir, fazla mesai varsa algılanır.' }
        ],
        faq: [
            { q: 'Kartsız giriş talebi ne kadar geçmişe verilebilir?', a: 'Geçmiş 2 mali ay içindeki tarihler için verilebilir. Örneğin bugün 15 Mart ise, Ocak ayının 26sından itibaren tüm tarihler için talep oluşturabilirsiniz.' },
            { q: 'Aynı tarih için birden fazla kartsız giriş talebi verebilir miyim?', a: 'Hayır. Aynı tarih için zaten bekleyen veya onaylanmış bir kartsız giriş talebiniz varsa, yeni talep oluşturamazsınız.' },
            { q: 'Yöneticim talebi reddederse ne olur?', a: 'Puantajınızda herhangi bir değişiklik olmaz. Red bildiriminde yöneticinizin gerekçesini görebilirsiniz. Gerekirse düzeltip yeni talep oluşturabilirsiniz.' },
            { q: 'Kartsız giriş onaylandıktan sonra fazla mesai algılanır mı?', a: 'Evet. Onay sonrası puantaj yeniden hesaplanır. Belirttiğiniz çıkış saati vardiya bitiş saatini aşıyorsa ve tolerans penceresi dışındaysa, potansiyel fazla mesai kaydı otomatik oluşturulur.' }
        ]
    },
    {
        id: 'ek-mesai',
        title: 'Ek Mesai',
        icon: Timer,
        description: '3 talep yolu (planli, algılanan, manuel), haftalık limit, talep durumları ve onay süreçleri. (Tüm çalışanlar görebilir)',
        permission: null,
        link: '/requests',
        images: [
            { src: '/help-images/help-talepler-03.png', caption: 'Ek mesai sekmesi — planli, algılanan ve manuel mesai talepleri' },
            { src: '/help-images/help-talepler-06.png', caption: 'Ek mesai alt sekmeler — atanan mesailer, potansiyel mesailer ve manuel giriş detayları' }
        ],
        steps: [
            {
                title: 'Ek Mesai Talep Yollari',
                description: 'Sistemde 3 farklı talep yolu vardır: (1) Planli — yönetiçinizin size atadigi mesai görevlerinden talep. (2) Algilanan — sistemin otomatik tespit ettigi potansiyel mesailerden talep. (3) Manuel — kendiniz giriş yaparak oluşturdugünüz talep.',
                image: { src: '/help-images/help-talepler-03.png', caption: 'Ek mesai talep türleri' }
            },
            {
                title: 'Planli Mesai Talebi',
                description: 'Yönetiçiniz size mesai görevi atadiginda "Atanan Mesailer" listesinde görürsünüz. "Talep Et" düğmesine tıklayın, saatler otomatik dolar. Aciklama ekleyip gönderin.'
            },
            {
                title: 'Algilanan (Potansiyel) Mesai Talebi',
                description: 'Vardiya sonrası, öncesi veya tatil gününde çalışmaniz algılandığında sistem potansiyel mesai oluştürür. Günbazli gruplama ile görürsünüz. Her bölüm için ayri talep edebilirsiniz. Türrozeti: vardiya öncesi, vardiya sonrası, tatil günü, karisik.'
            },
            {
                title: 'Manuel Mesai Talebi',
                description: '"Manuel Giriş" formu ile tarih, başlangıç/bitiş saati, görevaçıklamasi girerek talep oluşturun. Haftalık limit kontrolu anında yapılır.'
            },
            {
                title: 'Haftalık Limit Kontrolu',
                description: 'Her çalışanın haftalık ek mesai limiti vardır (varsayılan 30 saat). Son 7 gündeki onaylanmış ve bekleyen mesai toplamı bu limiti aşamaz. Limit dolduğunda talep formlari devre dışı kalır.'
            },
            {
                title: 'Talep Durumlari',
                description: 'Potansiyel (sistem algiladi), Bekleyen (onay bekleniyor), Onaylandi (yeşil), Reddedildi (kırmızı), İptal (gri). Durum değişikliklerinde bildirim alırsiniz.'
            }
        ],
        tips: [
            { type: 'info', text: '3 talep yolu: Planli (yöneticinin atadigi görevden), Algilanan (sistemin otomatik tespit ettigi), Manuel (kendiniz girdiginiz). Her birinin kaynak rozeti farklı renkte gösterilir.' },
            { type: 'warning', text: 'Haftalık ek mesai limiti (varsayılan 30 saat) dolduğunda yeni talep oluşturulamaz. İlerleme çubuğu kırmızıya donerse limitinizi kontrol edin.' },
            { type: 'info', text: 'Günlük toplam mesai süresi minimum eşiği (30 dk) gecmezse potansiyel kayıt oluşturulmaz.' },
            { type: 'success', text: 'Talepler 2 mali ay geriye dönük pencere içinde oluştürülabilir. Süresi geçen talepler otomatik olarak sonlandırılır.' }
        ],
        faq: [
            { q: 'Potansiyel mesai nedir?', a: 'Vardiya sonrası, öncesi veya tatil gününde çalıştığınızda sistem otomatik olarak algilar ve potansiyel mesai kaydı oluştürür. Bu kaydı talep ederek resmi mesai talebine donusturebilirsiniz.' },
            { q: 'Haftalık limit nasıl hesaplanıyor?', a: 'Son 7 gündeki onaylanmış ve bekleyen mesai toplamı hesaplanır. Varsayılan limit 30 saattir, çalışan bazında değişebilir.' },
            { q: 'Planli mesaimi görmüyorum, neden?', a: 'Yönetiçiniz size mesai görevi atamış olmalidir. Atanan mesaileri "Ek Mesai" sekmesinden kontrol edin.' },
            { q: 'Manuel giriş ile potansiyel mesai farkı nedir?', a: 'Potansiyel mesai sistemin kart okutma verilerinizden otomatik tespit ettigi mesaidir. Manuel giriş ise siz kendiniz tarih ve saat girerek oluştürürsunuz.' },
            { q: 'Mesai talebim kime gidiyor?', a: 'Birincil veya ikincil yöneticinize gider. İkincil yönetici sadece ek mesai işlemleri için yetkilidir. Talep oluşturma sırasında yönetici seçimi yapabilirsiniz.' }
        ]
    },
    {
        id: 'yemek-siparişi',
        title: 'Yemek Siparişi',
        icon: Utensils,
        description: 'Günlük yemek siparişi oluşturma, iptal etme ve sipariş takibi. (Tüm çalışanlar görebilir)',
        permission: null,
        link: '/meal-orders',
        images: [
            { src: '/help-images/help-yemek-01.png', caption: 'Yemek siparişi sayfası — günlük sipariş listesi ve oluşturma formu' }
        ],
        steps: [
            {
                title: 'Yemek Siparişi Sayfasina Erişim',
                description: 'Sol menüden "Yemek Siparişi" seçeneğine tıklayın. Sayfa günlük sipariş durumunuzu ve mevcut siparişleri gösterir.',
                image: { src: '/help-images/help-yemek-01.png', caption: 'Yemek siparişi sayfası' }
            },
            {
                title: 'Sipariş Oluşturma',
                description: 'İlgili gün için "Sipariş Ver" düğmesine tıklayın. Menu seçeneklerinden birini seçin ve onaylayın. Sipariş kesim saatine dikkat edin.'
            },
            {
                title: 'Sipariş İptali',
                description: 'Kesim saatinden önce siparişi iptal edebilirsiniz. Sipariş satırındaki "İptal" düğmesine tıklayın.'
            },
            {
                title: 'Sipariş Geçmişi',
                description: 'Geçmiş siparişlerinizi tarih süzgeçi ile görüntüleyebilirsiniz. Her sipariş için tarih, menu seçimi ve durum bilgisi listelenir.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Sipariş kesim saatinden sonra sipariş verilemez veya iptal edilemez. Kesim saatini takip edin.' },
            { type: 'info', text: 'Yemek siparişleri ek mesai analizlerinde mesai-yemek iliskişi olarak değerlendirilir.' },
            { type: 'success', text: 'Ertesi gün için önceden sipariş verebilirsiniz.' }
        ],
        faq: [
            { q: 'Sipariş kesim saatini kaçırdım, ne yapabilirim?', a: 'Kesim saatinden sonra sipariş veya iptal işlemleri yapılamaz. Bir sonraki gün için sipariş verebilirsiniz.' },
            { q: 'Siparişimi değiştirebilir miyim?', a: 'Kesim saatinden önce mevcut siparişi iptal edip yenisini oluşturabilirsiniz.' },
            { q: 'Yemek siparişi zorunlu mu?', a: 'Hayır. Yemek siparişi tamamen istege bağlıdır.' },
            { q: 'Geçmiş siparişlerimi nasıl görürum?', a: 'Yemek siparişi sayfasında tarih süzgeçini kullanarak geçmiş siparişlerinizi listeleyebilirsiniz.' }
        ]
    },
    {
        id: 'takvim',
        title: 'Takvim',
        icon: Calendar,
        description: 'Kişisel ve ekip takvimi, izin/mesai/tatil görünümu, gündetayi ve ek mesai atama paneli. (Tüm çalışanlar görebilir)',
        permission: null,
        link: '/calendar',
        images: [
            { src: '/help-images/help-takvim-01.png', caption: 'Takvim genel görünüm — aylık takvim, etkinlik renk kodları ve süzgeçler' },
            { src: '/help-images/help-takvim-02.png', caption: 'Gündetay paneli — secilen günün detayları ve işlemler' }
        ],
        steps: [
            {
                title: 'Takvim Sayfasina Erişim',
                description: 'Sol menüden "Takvim" seçeneğine tıklayın. Ajanda odakli tek modlu takvim görünümu açılır. Tatiller kırmızı, izinler yeşil, mesai görevleri mor, bekleyen talepler amber renkte gösterilir.',
                image: { src: '/help-images/help-takvim-01.png', caption: 'Takvim genel görünüm' }
            },
            {
                title: 'GünDetay Paneli',
                description: 'Herhangi bir gune tıklayın, sağdan kayan detay paneli açılır. O günün çalışma durumu, izinler, mesai atamaları ve kişisel etkinlikler listelenir.',
                image: { src: '/help-images/help-takvim-02.png', caption: 'Gündetay paneli' }
            },
            {
                title: 'Etkinlik Ekleme',
                description: 'Gündetay panelinden kişisel etkinlik (toplanti, hatirlatma vb.) ekleyebilirsiniz. Görünürlük seçenekleri: özel, departman, herkese açık.'
            },
            {
                title: 'Ekip Takvimi',
                description: 'Yöneticiler ekip görünümünde çalışanların izin, mesai, devamsızlık ve sağlık raporu durumlarıni Gantt çubuğu olarak görebilir. Yarim güntatiller çapraz çizgili gösterilir.'
            }
        ],
        tips: [
            { type: 'info', text: 'Etkinlik renk kodları: kırmızı = resmi tatil, yeşil = onaylı izin, mor = mesai görevi, amber = bekleyen talep, pembe = sağlık raporu, mavi = kişisel etkinlik.' },
            { type: 'success', text: 'Yöneticiler gündetay panelinden doğrudan ek mesai ataması yapabilir.' },
            { type: 'info', text: 'Ardışık tatiller otomatik birlestirilir (ornegin "Ramazan Bayrami, 3 gun").' }
        ],
        faq: [
            { q: 'Ekip takvimini nasıl görürum?', a: 'Yönetici yetkiniz varsa takvim sayfasında ekip görünümune gecebilirsiniz. Çalışanlarinizin izin ve mesai durumlarıni Gantt çubuğu olarak görürsünüz.' },
            { q: 'Kişisel etkinliklerimi baskasi görebilir mi?', a: 'Görünürlük ayarina bağlıdır. "Özel" seçerseniz sadece siz görürsünüz. "Departman" seçerseniz departmaniniz, "Herkese açık" seçerseniz tümşirket görebilir.' },
            { q: 'Takvimde hangi dönemler gosteriliyor?', a: 'Takvim standart takvim aylarini gösterir. Mali dönem bazli görünüm kaldırılmıştır, ajanda odakli tek mod kullanilmaktadir.' },
            { q: 'Yarim güntatiller nasıl gosteriliyor?', a: 'Yarim güntatiller çapraz çizgili (diagonal stripe) olarak işaretlenir.' }
        ]
    },
    {
        id: 'sirket-rehberi',
        title: 'Şirket Rehberi',
        icon: Contact,
        description: 'Çalışanlari arama, iletişim bilgilerine erişim ve departman bazli filtreleme. (Tüm çalışanlar görebilir)',
        permission: null,
        link: '/directory',
        images: [
            { src: '/help-images/help-rehber-01.png', caption: 'Şirket rehberi — çalışan kartları, arama çubuğu ve departman süzgeçi' },
            { src: '/help-images/help-rehber-02.png', caption: 'Şirket rehberi kartlar — çalışan detay bilgileri ve iletişim' }
        ],
        steps: [
            {
                title: 'Rehber Sayfasina Erişim',
                description: 'Sol menüden "Şirket Rehberi" seçeneğine tıklayın. Tüm aktif çalışanlar kart görünümünde listelenir.',
                image: { src: '/help-images/help-rehber-01.png', caption: 'Şirket rehberi genel görünüm' }
            },
            {
                title: 'ÇalışanArama',
                description: 'Üst kısımda yer alan arama çubuğuna ad, soyad veya departman adı yazarak arama yapın. Sonuclar anlık olarak süzülür.'
            },
            {
                title: 'Departman Suzgeci',
                description: 'Departman secici ile belirli bir departmandaki çalışanlari filtreleyin. Birden fazla departman secebilirsiniz.'
            },
            {
                title: 'ÇalışanKarti Detaylari',
                description: 'Her kartta çalışanın adi, departmani, pozisyonu, telefonu ve e-posta adresi gösterilir. Karta tıklayarak detayli iletişim bilgilerine ulaşın.'
            }
        ],
        tips: [
            { type: 'info', text: 'Rehber sadece aktif çalışanlari gösterir. Deaktif edilmiş hesaplar listelenmez.' },
            { type: 'success', text: 'Çalışan kartındaki telefon numarasına tıklayarak doğrudan arama yapabilirsiniz (mobil cihazlarda).' },
            { type: 'info', text: 'Arama çubuğu ad, soyad ve departman üzerinde anlık süzme yapar. En az 2 karakter girin.' }
        ],
        faq: [
            { q: 'Rehberde bulamadigim bir calisani nasıl ararim?', a: 'Rehber sadece aktif çalışanlari gösterir. Aranan kişi deaktif edilmiş veya şirket dışında olabilir. İK birimine başvurun.' },
            { q: 'Kendi iletişim bilgilerim yanlış görünüyor?', a: 'Profilim sayfasından iletişim bilgilerinizi güncelleyebilirsiniz. Departman ve pozisyon bilgileri için yöneticinize başvurun.' },
            { q: 'TC kimlik numarasıni rehberde görebilir miyim?', a: 'Hayır. TC kimlik numarası KVKK kapsamında hassas veridir ve rehberde gösterilmez.' },
            { q: 'Rehberdeki bilgiler ne sıklıkla güncellenir?', a: 'Rehber veritabanından canlı veri ceker. Profil güncellendikten sonra rehbere anında yansır.' }
        ]
    },
    {
        id: 'dilek-sikayetler',
        title: 'Dilek ve Şikayetler',
        icon: MessageSquare,
        description: 'Geri bildirim, öneri, şikayet ve sorun bildirimi oluşturma ile takip etme. (Tüm çalışanlar görebilir)',
        permission: null,
        link: '/feedback',
        images: [
            { src: '/help-images/help-geribildirim-01.png', caption: 'Dilek ve şikayetler sayfası — bildirim listesi, durum süzgeçleri ve yeni bildirim oluşturma' },
            { src: '/help-images/help-geribildirim-02.png', caption: 'Yeni geri bildirim oluşturma modalı — tür seçimi, başlık, açıklama ve dosya ekleme' }
        ],
        steps: [
            {
                title: 'Sayfaya Erişim',
                description: 'Sol menüden "Dilek ve Şikayetler" seçeneğine tıklayın. "Benim Bildirimlerim" ve "Yönetim" (yetkililer için) sekmeleri görürsünüz.',
                image: { src: '/help-images/help-geribildirim-01.png', caption: 'Dilek ve şikayetler sayfası' }
            },
            {
                title: 'Yeni Bildirim Oluşturma',
                description: '"Yeni Bildirim" düğmesine tıklayın. Türseçin (öneri, şikayet, sorun), başlık ve açıklama yazın. Gerekirse dosya ekleyin ve gönderin.'
            },
            {
                title: 'Bildirim Takibi',
                description: 'Gönderdiginiz bildirimlerin durumunu "Benim Bildirimlerim" sekmesinden takip edin. Durum: bekleyen, inceleniyor, çözüldü, kapatildi.'
            },
            {
                title: 'Yönetim Sekmesi',
                description: 'Yetkili yöneticiler gelen tümbildirimleri görebilir, yanit verebilir ve durumlarıni güncelleyebilir.'
            }
        ],
        tips: [
            { type: 'info', text: 'Bildirimleriniz gizlilik politikasina uygun olarak işlenilir. Anonim bildirim seçeneği mevcut olabilir.' },
            { type: 'success', text: 'Detayli açıklama ve ek dosyalar sorunun hızlı çözülmesine yardimci olur.' },
            { type: 'warning', text: 'Kapatilmis bir bildirime yeni yanit eklenemez. Gerekirse yeni bildirim oluşturun.' }
        ],
        faq: [
            { q: 'Bildirimim kime gidiyor?', a: 'Bildirimler sistem yöneticilerine ve yetkili yöneticilere iletilir. "Yönetim" sekmesi olan kullanicilar görebilir.' },
            { q: 'Bildirimimi silebilir miyim?', a: 'Gönderilmis bildirimleri silemezsiniz ancak iptal edebilirsiniz.' },
            { q: 'Yanit geldiginde bildirim alır miyim?', a: 'Evet, bildiriminize yanit geldiginde uygulama içi bildirim alırsiniz.' },
            { q: 'Dosya ekleyebilir miyim?', a: 'Evet, bildirim oluştürürken veya yanit verirken dosya ekleyebilirsiniz.' }
        ]
    },
    {
        id: 'vekalet-yönetimi',
        title: 'Vekalet Yönetimi',
        icon: UserCheck,
        description: 'İzin veya uzun süreli yokluk durumlarında vekalet atama ve yönetme. (Tüm çalışanlar görebilir)',
        permission: null,
        link: '/substitutes',
        images: [
            { src: '/help-images/help-vekalet-01.png', caption: 'Vekalet yönetimi — aktif vekaletler, geçmiş ve yeni vekalet atama' },
            { src: '/help-images/help-vekalet-02.png', caption: 'Vekalet yönetimi detay — vekalet süresi, vekil bilgileri ve işlem geçmişi' }
        ],
        steps: [
            {
                title: 'Vekalet Sayfasina Erişim',
                description: 'Sol menüden "Vekalet Yönetimi" seçeneğine tıklayın. Aktif ve geçmiş vekaletleriniz listelenir.',
                image: { src: '/help-images/help-vekalet-01.png', caption: 'Vekalet yönetimi sayfası' }
            },
            {
                title: 'Yeni Vekalet Atama',
                description: '"Vekalet Ata" düğmesine tıklayın. Vekil olacak kişiyi seçin, başlangıç/bitiş tarihlerini belirleyin ve onaylayın. Vekil kişi bildirim alır.'
            },
            {
                title: 'Aktif Vekaletler',
                description: 'Size atanmış veya sizin atadiginiz aktif vekaletleri gorun. Vekalet süresi, vekil kişi bilgileri ve durum gösterilir.'
            },
            {
                title: 'Vekalet İptali',
                description: 'Aktif bir vekaleti erken sonlandırmak için "Sonlandır" düğmesine tıklayın. Her iki taraf da bildirim alır.'
            }
        ],
        tips: [
            { type: 'info', text: 'Vekalet süresi içinde vekil kişiye gelen talepler (kartsız giriş, izin onay vb.) otomatik yönlendirilir.' },
            { type: 'warning', text: 'Vekalet bitiş tarihi geçtiğinde otomatik sonlanır. Uzatma gerekirse yeni vekalet oluşturun.' },
            { type: 'success', text: 'Uzun süreli izne çıkmadan önce vekalet atamak onay süreçlerinin aksamasını önler.' }
        ],
        faq: [
            { q: 'Vekalet atandığımda hangi yetkilere sahip olurum?', a: 'Asil kişinin talep onay/red yetkilerini geçici olarak devralırsınız. Vekalet süresi içinde gelen talepler size yönlendirilir.' },
            { q: 'Birden fazla kişiye vekalet atayabilir miyim?', a: 'Her seferde bir vekil atanabilir. Farklı dönemler için farklı vekiller tanımlayabilirsiniz.' },
            { q: 'Vekaletim ne zaman biter?', a: 'Belirlediğiniz bitiş tarihinde otomatik sonlanır. Erken sonlandırma için "Sonlandır" düğmesini kullanın.' },
            { q: 'Vekalet değişikliklerinde bildirim alır miyim?', a: 'Evet, vekalet atanma, değişiklik ve sonlanma durumlarında her iki taraf da bildirim alır.' }
        ]
    },
    {
        id: 'onay-surecleri',
        title: 'Onay Süreçleri',
        icon: CheckSquare,
        description: 'Gelen talepleri onaylama/reddetme, yönetici hiyerarşisi, birincil/ikincil yönetici farkı ve eskalasyon. (Onay yetkisi olan yöneticiler görebilir)',
        permission: ['APPROVAL_OVERTIME', 'APPROVAL_LEAVE', 'APPROVAL_CARDLESS_ENTRY'],
        link: '/requests',
        images: [
            { src: '/help-images/help-talepler-02.png', caption: 'Gelen talepler sekmesi — onay/red düğmeleri, talep detay paneli ve süzgeçler' }
        ],
        steps: [
            {
                title: 'Gelen Talepler Sekmesine Erişim',
                description: 'Talepler sayfasında "Gelen Talepler" sekmesine tıklayın. Size yönlendirilmiş bekleyen talepler listelenir. Her talep satırında çalışan adı, talep türü, tarih ve durum bilgisi görünür.',
                image: { src: '/help-images/help-talepler-02.png', caption: 'Gelen talepler listesi' }
            },
            {
                title: 'Talep Onaylama',
                description: 'Talebin yanındaki "Onayla" düğmesine tıklayın. Onay penceresi açılır. Gerekirse açıklama ekleyin ve "Onayla" ile işlemi tamamlayın. Çalışan bildirim alır.'
            },
            {
                title: 'Talep Reddetme',
                description: '"Reddet" düğmesine tıklayın. Red gerekçe alanına neden yazın ve onaylayın. Çalışan red gerekçe bilgisiyle birlikte bildirim alır.'
            },
            {
                title: 'Yönetici Hiyerarşisi',
                description: 'Onay 5 katmanlı hiyerarşiyle çalışır: (1) Birincil yönetici, (2) Departman yöneticisi, (3) Üst hiyerarşi zinciri, (4) Departman hiyerarşisi yedeği. Birincil yönetici bulunamazsa sıradaki katman devreye girer.'
            },
            {
                title: 'Birincil ve İkincil Yönetici Farkı',
                description: 'Birincil yönetici: tüm talep türleri (izin, kartsız giriş, ek mesai) için onay yetkisine sahiptir. İkincil yönetici: SADECE ek mesai işlemleri (talep, onay, analiz) için yetkilidir. İzin ve kartsız giriş talepleri ikincil yöneticiye gitmez.'
            }
        ],
        tips: [
            { type: 'info', text: 'Birincil yönetici tüm talep türleri için yetkilidir. İkincil yönetici sadece ek mesai işlemleri (talep oluşturma, onay/red, analiz görüntüleme) için yetkilidir.' },
            { type: 'warning', text: 'Kendi talebinizi kendiniz onaylayamazsınız. Sistem bu durumu engelleyerek üst yöneticiye eskalasyon yapar.' },
            { type: 'success', text: 'Onay sonrası ilgili kayıtlar otomatik güncellenir: izin bakiyesi düşülür, mesai kaydı oluşturulur, puantaj yeniden hesaplanır.' },
            { type: 'info', text: 'Yönetici değiştiğinde bekleyen talepler otomatik olarak yeni yöneticiye devredilir. Her iki yönetici ve çalışan bildirim alır.' }
        ],
        faq: [
            { q: 'Gelen talepler sekmesini görmüyorum?', a: 'Onay yetkisi gerektirir. Birincil veya ikincil yönetici olarak atanmış olmalısınız. Sistem yöneticinize başvurun.' },
            { q: 'Talebi onayladım ama geri alabilir miyim?', a: 'Onaylanmış talepler doğrudan geri alınamaz. Sistem yöneticisine başvurun veya çalışandan iptal talep edin.' },
            { q: 'Birden fazla yöneticinin onaylaması gerekiyor mu?', a: 'Hayır, tek yönetici onayı yeterlidir. Talep ilk yetkili yöneticiye gider, o karar verir.' },
            { q: 'Bekleyen talepler ne kadar sürede işlenmelidir?', a: 'Bekleyen talepler için kesin bir süresınırı yoktur ancak hızlı işlem çalışanların planlamasini kolaylaştırır. Uzun süreli bekleme durumunda eskalasyon tetiklenebilir.' },
            { q: 'Yönetici degisirse bekleyen talepler ne olur?', a: 'Birincil yönetici değiştiğinde bekleyen izin, mesai ve kartsız giriş talepleri otomatik olarak yeni yöneticiye devredilir. Üç taraf (yeni yönetici, eski yönetici, calisan) bildirim alır.' }
        ]
    },
    {
        id: 'raporlar',
        title: 'Raporlar',
        icon: BarChart3,
        description: 'Puantaj, mesai, izin ve devamsızlık raporları oluşturma, dışa aktarma ve talep analizi. (Yöneticiler ve sistem yöneticileri görebilir)',
        permission: 'PAGE_REPORTS',
        link: '/reports',
        images: [
            { src: '/help-images/help-raporlar-01.png', caption: 'Raporlar sayfası — rapor türleri, tarih süzgeçi ve dışa aktarma seçenekleri' },
            { src: '/help-images/help-raporlar-02.png', caption: 'Raporlar grafik ve tablo — puantaj verileri, grafiksel özet ve detay tablosu' }
        ],
        steps: [
            {
                title: 'Raporlar Sayfasina Erişim',
                description: 'Sol menüden "Raporlar" seçeneğine tıklayın. Rapor türleri, tarih aralığı süzgeçi ve dışa aktarma seçenekleri gösterilir.',
                image: { src: '/help-images/help-raporlar-01.png', caption: 'Raporlar sayfası' }
            },
            {
                title: 'Rapor Turu Seçimi',
                description: 'Puantaj, ek mesai, izin kullanımı, devamsızlık ve diger rapor türlerinden birini seçin. Her rapor türü farklı veri setini içerir.'
            },
            {
                title: 'Tarih Araligi ve Suzgecler',
                description: 'Rapor dönemi için başlangıç/bitiş tarihlerini seçin. Departman, çalışan ve durum süzgeçleri ile sonuçları daraltabilirsiniz.'
            },
            {
                title: 'Dışa Aktarma',
                description: 'Raporları Excel, PDF veya DOCX formatinda dışa aktarabilirsiniz. Dışa aktar düğmesine tıklayın ve format seçin.'
            }
        ],
        tips: [
            { type: 'info', text: 'Raporlar mali dönem bazlidir (26-25 kurali). Ay başlangıçi olarak ayin 26\'si kabul edilir.' },
            { type: 'success', text: 'Birden fazla departman veya çalışansecilerek toplu rapor oluştürülabilir.' },
            { type: 'warning', text: 'Buyuk tarih aralikli raporlar biraz zaman alabilir. Lutfen sabirdla bekleyin.' }
        ],
        faq: [
            { q: 'Bu sayfayı göremiyorum, ne yapmalıyım?', a: 'PAGE_REPORTS yetkisi gereklidir. Bu yetki genellikle yönetici ve muhasebe rollerine tanımlıdır. Sistem yöneticinize başvurun.' },
            { q: 'Rapor verileri ne sıklıkla güncellenir?', a: 'Raporlar canlı veritabanından üretilir. Her oluşturmada guncel veri cekilir.' },
            { q: 'Kilitli dönemlerin raporlarıni görebilir miyim?', a: 'Evet, kilitli dönemlerin raporlarıni görüntüleyebilirsiniz ancak bu dönemlerdeki veriler değiştirilemez.' },
            { q: 'Excel\'e aktardigimda Turkce karakterler bozuluyor?', a: 'Sistem UTF-8 kodlama kullanir. Excel\'de dosyayi acarken "UTF-8" kodlamasini seçin.' }
        ]
    },
    {
        id: 'çalışma-programlari',
        title: 'Çalışma Takvimleri',
        icon: CalendarRange,
        description: 'Mali takvim, vardiya şablonları, günatamaları ve özel güntanımlamalari. (Yöneticiler ve sistem yöneticileri görebilir)',
        permission: 'PAGE_WORK_SCHEDULES',
        link: '/work-schedules',
        images: [
            { src: '/help-images/help-programlar-01.png', caption: 'Çalışma takvimleri — mali takvim listesi, şablon detayları ve gün atamaları' },
            { src: '/help-images/help-programlar-02.png', caption: 'Çalışma takvimleri detay — vardiya şablonu, gün kuralları ve tolerans ayarları' }
        ],
        steps: [
            {
                title: 'Sayfaya Erişim',
                description: 'Sol menüden "Çalışma Takvimleri" seçeneğine tıklayın. Mali takvimler ve vardiya şablonları listelenir.',
                image: { src: '/help-images/help-programlar-01.png', caption: 'Çalışma takvimleri sayfası' }
            },
            {
                title: 'Mali Takvim Yapisi',
                description: 'Mali takvim yıllık çalışma planini içerir. Varsayılan mali dönem: ayin 26\'sindan bir sonraki ayin 25\'ine kadar. Takvim içinde resmi tatiller, özel günler ve vardiya değişiklikleri tanımlanir.'
            },
            {
                title: 'Vardiya Şablonlari',
                description: 'Her takvimin altında vardiya şablonları bulunur. Şablon içinde hafta günleri bazinda mesai başlangıç/bitiş saatleri, tatil günleri, tolerans ve mola süresi tanımlanir.'
            },
            {
                title: 'GünAtamalari',
                description: 'Belirli günlere özel kurallar atanabilir. Ornegin bir cumartesiyi çalışma günü yapmak veya bir hafta içi günü tatil tanımlamak için günataması kullanılır.'
            },
            {
                title: 'Degisiklik Sonrasi Yeniden Hesaplama',
                description: 'Takvim değişiklikleri kaydedildiğinde etkilenen çalışanların puantajları otomatik yeniden hesaplanır. Bu işlem asenkron olarak gerçekleşir ve ilerleme çubuğu ile takip edilebilir.'
            }
        ],
        tips: [
            { type: 'info', text: 'Tolerans değerleri (servis toleransı, normal tolerans, minimum mesai eşiği) mali takvim ve vardiya şablonundan okunur. Çalışan bazlı geçersiz kilma sadece servis toleransı için mumkundur.' },
            { type: 'warning', text: 'Takvim değişiklikleri tümilgili çalışanların puantajını etkiler. Buyuk değişiklikleri yoğun saatlerde yapmaktan kaçının.' },
            { type: 'success', text: 'Yıllık tatil planini dönem başında tanımlayin. Resmi tatiller tüm çalışanların takviminde otomatik gösterilir.' },
            { type: 'warning', text: 'Kilitli mali dönemlerdeki takvim değişiklikleri puantaja yansımaz. Değişiklik yapmadan önce ilgili dönemin kilit durumunu kontrol edin.' },
            { type: 'info', text: 'Takvim değişikliği yapıldığında, etkilenen tüm çalışanların puantajları otomatik yeniden hesaplanır. Bu işlem büyük takvimlerde birkaç dakika sürebilir — ilerleme çubuğundan takip edebilirsiniz.' }
        ],
        faq: [
            { q: 'Bu sayfayı göremiyorum?', a: 'PAGE_WORK_SCHEDULES yetkisi gereklidir. Sistem yöneticinize başvurun.' },
            { q: 'Mali dönem nedir?', a: 'Varsayılan olarak ayin 26\'sindan bir sonraki ayin 25\'ine kadar olan suredir. Ornegin "Mart 2026" dönemi: 26 Subat - 25 Mart.' },
            { q: 'Takvim degisikligi mevcut kayıtları etkiler mi?', a: 'Evet. Kilitli dönemler hariçinde tümetkilenen kayıtlar otomatik yeniden hesaplanır.' },
            { q: 'Farklı departmanlar için farklı takvim olabilir mi?', a: 'Evet. Her mali takvim farklı vardiya şablonları içerebilir ve çalışanlara farklı takvimler atanabilir.' }
        ]
    },
    {
        id: 'sistem-yönetimi',
        title: 'Sistem Sagligi',
        icon: Shield,
        description: 'Sistem durumu, yetki denetimi, devamsızlık denetimi, özellik testleri, veri bütünlüğü ve şifre sıfırlama. (Sadece sistem yöneticileri görebilir)',
        permission: 'PAGE_SYSTEM_HEALTH',
        link: '/system-health',
        images: [
            { src: '/help-images/help-sistem-01.png', caption: 'Sistem sagligi — denetim sekmeleri, durum kartları ve işlem düğmeleri' },
            { src: '/help-images/help-sistem-02.png', caption: 'Sistem sagligi detay — denetim sonuçları, düzeltme önerileri ve test çıktıları' }
        ],
        steps: [
            {
                title: 'Sistem Sagligi Sayfasina Erişim',
                description: 'Sol menüden "Sistem Sagligi" seçeneğine tıklayın. 4 ana denetim sekmesi bulunur: Genel Durum, Yetki Denetimi, Devamsizlik Denetimi, Özellik Testleri.',
                image: { src: '/help-images/help-sistem-01.png', caption: 'Sistem sagligi sayfası' }
            },
            {
                title: 'Genel Durum Sekmesi',
                description: 'Sistem bilesenlerinin (veritabanı, Celery iş kuyrugu, dis servisler) durumunu gösterir. Şifre sıfırlama işlemi bu sekmeden yapılır.'
            },
            {
                title: 'Yetki Denetimi',
                description: 'Rol ve yetki yapısının tutarlılığıni kontrol eder. Eksik yetkiler, yanlış atamalar ve miras bozuklukları tespit edilir.'
            },
            {
                title: 'Devamsizlik Denetimi',
                description: 'Puantaj kayıtlarınin tutarlılığıni denetler. 7 kategori taranır: mesai çakışması, puantaj yeniden hesaplama, sahipsiz talepler, süreuyumsuzluğu, durum anomalisi, eksik puantaj ve mali dönem bütünlüğü.'
            },
            {
                title: 'Özellik Testleri',
                description: '52 aşamalı özellik testi calistirilir. Her asama farklı bir sistem özelligini test eder. Sonuclar başarılı/başarısız olarak gösterilir.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Şifre sıfırlama işlemi tümsecilen çalışanların şifrelerini değiştirir. Sıfırlanmış şifreler XLSX dosyası olarak indirilir. Bu işlemi dikkatli yapın.' },
            { type: 'info', text: 'Veri bütünlüğü denetimi "tarama" ve "düzeltme" modlarinda çalışır. Once tarama yapip sorunlari inceleyin, sonra düzeltme modu ile otomatik onarım yapın.' },
            { type: 'success', text: 'Duzensiz araliklarda denetim çalıştırmak potansiyel sorunlari erkenden tespit etmenize yardimci olur.' }
        ],
        faq: [
            { q: 'Bu sayfayı göremiyorum?', a: 'PAGE_SYSTEM_HEALTH yetkisi veya SYSTEM_FULL_ACCESS (sistem yöneticisi) yetkisi gereklidir.' },
            { q: 'Denetim sonuçlarında "duzelt" ne yapar?', a: 'Duzeltme modu tespit edilen uyumsuzluklari otomatik onarir. Ornegin puantaj yeniden hesaplama, sahipsiz talep temizligi gibi işlemler yapar.' },
            { q: 'Şifre sıfırlama sonrası ne olur?', a: 'Sifirlanan çalışanlara geçici şifre atanir ve XLSX dosyası indirilir. Çalışanlar ilk girişte yeni şifre belirlemeye zorlanir.' },
            { q: 'Özellik testlerini ne sıklıkla çalıştırmaliyim?', a: 'Buyuk değişiklik veya güncelleme sonrasında çalıştırmaniz önerilir. Rutin kullanim için ayda bir yeterlidir.' }
        ]
    },
    {
        id: 'çalışanlar',
        title: 'Çalışanlar',
        icon: Users,
        description: 'Çalışan listesi, yeni çalışanekleme, bilgi düzenleme, yönetici atama ve çalışandeaktif etme. (Yöneticiler ve sistem yöneticileri görebilir)',
        permission: 'PAGE_EMPLOYEES',
        link: '/employees',
        images: [
            { src: '/help-images/help-calisanlar-01.png', caption: 'Çalışanlar sayfası — çalışan listesi, arama, süzgeçler ve işlem düğmeleri' },
            { src: '/help-images/help-calisanlar-02.png', caption: 'Çalışan listesi — aşağı kaydırılmış görünüm ve tablo detayları' }
        ],
        steps: [
            {
                title: 'Çalışan Listesi',
                description: 'Sol menüden "Çalışanlar" seçeneğine tıklayın. Tüm çalışanlar tablo görünümünde listelenir. Ad, departman, pozisyon, durum ve işlem sütunları bulunur.',
                image: { src: '/help-images/help-calisanlar-01.png', caption: 'Çalışan listesi' }
            },
            {
                title: 'Yeni Çalışan Ekleme',
                description: '"Yeni Çalışan" düğmesine tıklayın. İki adımlı form açılır: (1) Temel bilgiler — ad, soyad, e-posta, TC kimlik, departman, pozisyon. (2) Detay bilgiler — çalışma takvimi, giriş tarihi, yönetici ataması.'
            },
            {
                title: 'Çalışan Düzenleme',
                description: 'Çalışan satırındaki "Düzenle" düğmesine tıklayın. Tüm bilgileri güncelleyebilirsiniz: kişisel bilgiler, departman, pozisyon, çalışma takvimi, yönetici atamaları.'
            },
            {
                title: 'Yönetici Atama',
                description: 'Çalışan detay sayfasında birincil ve ikincil yönetici ataması yapılır. Birincil yönetici tüm yetkilere sahiptir. İkincil yönetici sadece ek mesai işlemleri için yetkilidir.'
            },
            {
                title: 'Çalışan Deaktif Etme',
                description: 'İşten ayrılan çalışanlar deaktif edilir (silinmez). Deaktif çalışan giriş yapamaz, rehberde görülmez ancak geçmiş kayıtları korunur.'
            }
        ],
        tips: [
            { type: 'info', text: 'Birincil yönetici değiştiğinde bekleyen talepler otomatik yeni yöneticiye devredilir. Her iki yönetici ve çalışan bildirim alır.' },
            { type: 'warning', text: 'Çalışan silmek yerine deaktif edin. Silme işlemi tüm geçmiş kayıtları kaybettirir. Deaktif edilen çalışanın puantaj ve talep geçmişi korunur.' },
            { type: 'success', text: 'Toplu işlem için birden fazla çalışan seçip departman veya yönetici ataması yapabilirsiniz.' },
            { type: 'info', text: 'İkincil yönetici atamalarında departman ve pozisyon bilgisi gerekmez, sadece kişi seçimi yeterlidir.' }
        ],
        faq: [
            { q: 'Bu sayfayı göremiyorum?', a: 'PAGE_EMPLOYEES yetkisi gereklidir. Bu yetki genellikle yönetici ve İK rollerine tanımlıdır.' },
            { q: 'Deaktif çalışan tekrar aktif edilebilir mi?', a: 'Evet, çalışan detay sayfasından "Aktif Et" düğmesiyle tekrar aktive edilebilir.' },
            { q: 'Yönetici değişimi bekleyen talepleri etkiler mi?', a: 'Evet. Birincil yönetici değiştiğinde bekleyen izin, mesai ve kartsız giriş talepleri otomatik yeni yöneticiye devredilir.' },
            { q: 'Çalışanın haftalık mesai limitini değiştirebilir miyim?', a: 'Evet. Çalışan düzenleme sayfasında "Haftalık Ek Mesai Limiti" alanını güncelleyebilirsiniz. Varsayılan 30 saattir.' }
        ]
    },
    {
        id: 'organizasyon-semasi',
        title: 'Organizasyon Şeması',
        icon: Network,
        description: 'Şirket hiyerarşisini görsel olarak görüntüleme, departman ve raporlama yapısını inceleme. (Tüm çalışanlar görebilir)',
        permission: null,
        link: '/org-chart',
        images: [
            { src: '/help-images/help-orgchart-01.png', caption: 'Organizasyon şeması — hiyerarşi ağacı, departman kutuları ve raporlama çizgileri' },
            { src: '/help-images/help-orgchart-02.png', caption: 'Organizasyon şeması — düğüm tıklanmış detay görünümü' }
        ],
        steps: [
            {
                title: 'ŞemaSayfasina Erişim',
                description: 'Sol menüden "Organizasyon Şeması" seçeneğine tıklayın. Şirket hiyerarşisi agac yapısında gösterilir.',
                image: { src: '/help-images/help-orgchart-01.png', caption: 'Organizasyon şeması' }
            },
            {
                title: 'Hiyerarşi Gezinme',
                description: 'Departman kutularına tıklayarak alt birimleri asin/kapatin. Her kutuda departman adi, yöneticisi ve çalışansayısı görülür.'
            },
            {
                title: 'ÇalışanDetayi',
                description: 'Çalışanismine tıklayarak kisa bilgi kartıni gorun: ad, pozisyon, departman, yönetici bilgisi.'
            },
            {
                title: 'Yakinlastirma ve Kaydirma',
                description: 'Fare tekerlegiyle yakinlasip uzaklasabilir, surukleme ile semayi kaydırabilirsiniz. Tam ekran düğmesi ile genis görünüm elde edin.'
            }
        ],
        tips: [
            { type: 'info', text: 'Organizasyon şeması canlı veritabanından oluşturulur. Çalışan veya departman değişiklikleri anında yansır.' },
            { type: 'success', text: 'Buyuk şirketlerde belirli bir departmani aramak için arama çubuğun kullanın.' },
            { type: 'info', text: 'Birincil yönetici ilişkileri duz çizgi, ikincil yönetici ilişkileri kesikli çizgi ile gösterilir.' }
        ],
        faq: [
            { q: 'Semada neden bazi çalışanlar görünmüyor?', a: 'Deaktif edilmiş çalışanlar semada gösterilmez. Yöneticisi atanmamis çalışanlar kok dugumlerde görünebilir.' },
            { q: 'Semayi dışa aktarabilir miyim?', a: 'Su an doğrudan dışa aktarma desteklenmemektedir. Ekran görüntüsü alabilirsiniz.' },
            { q: 'Departman yapısını değiştirmek için ne yapmalıyım?', a: 'Departman yönetimi için Çalışan Yönetimi sayfasından işlem yapabilir veya sistem yöneticinize başvurabilirsiniz.' },
            { q: 'Birincil ve ikincil yönetici farkı semada görülüyor mu?', a: 'Evet, birincil yönetici ilişkileri duz çizgi ile, ikincil yönetici ilişkileri kesikli çizgi ile gösterilir.' }
        ]
    },
    {
        id: 'servis-yönetimi',
        title: 'Servis Yönetimi',
        icon: Package,
        description: 'Servis guzerahi, servis noktasi tanımlama, calisan-servis eslestime ve servis toleransı yönetimi. (Yöneticiler ve sistem yöneticileri görebilir)',
        permission: 'PAGE_SERVICE_MANAGEMENT',
        link: '/service-management',
        images: [
            { src: '/help-images/help-servis-01.png', caption: 'Servis yönetimi — güzergah listesi, duraklar ve çalışan eşleşmeleri' },
            { src: '/help-images/help-servis-02.png', caption: 'Servis yönetimi detay — güzergah düzenleme, durak yönetimi ve tolerans ayarları' }
        ],
        steps: [
            {
                title: 'Sayfaya Erişim',
                description: 'Sol menüden "Servis Yönetimi" seçeneğine tıklayın. Servis güzergahlari ve noktalari listelenir.',
                image: { src: '/help-images/help-servis-01.png', caption: 'Servis yönetimi sayfası' }
            },
            {
                title: 'Guzergah Yönetimi',
                description: 'Yeni güzergah ekleyin veya mevcut güzergahlari düzenleyin. Her güzergah için kalkis/varis, duraklar ve seferler tanımlayabilirsiniz.'
            },
            {
                title: 'ÇalışanEslestirme',
                description: 'Çalışanlari servise kaydedin. Servis kullanan çalışanların giriş/çıkış saatleri servis toleransı kapsamında vardiya sınırlarinayuvarlanır.'
            },
            {
                title: 'Servis Toleransı',
                description: 'Servis kullanan çalışanlar için tolerans süresi takvim şablonunda veya çalışan bazında tanımlanir. Tolerans süresi içinde giriş/çıkış yuvarlama yapılır.'
            }
        ],
        tips: [
            { type: 'info', text: 'Servis toleransı sadece "servis kullaniyor" işaretli çalışanlar için geçerlidir. Diger çalışanlar bu toleranstan etkilenmez.' },
            { type: 'warning', text: 'Servis güzergahi degisikligi mevcut çalışaneslesmelerini etkilemez. Çalışanlari manuel olarak yeni güzergaha taşıyın.' },
            { type: 'success', text: 'Toplu çalışaneslestirme ile birden fazla calisani ayni anda servise kaydedin.' }
        ],
        faq: [
            { q: 'Bu sayfayı göremiyorum?', a: 'PAGE_SERVICE_MANAGEMENT yetkisi gereklidir. Sistem yöneticinize başvurun.' },
            { q: 'Servis toleransı nedir?', a: 'Servis kullanan çalışanların giriş/çıkış saatlerini vardiya sınırlarindayuvarlama süresidir. Ornegin 15 dk toleransta 07:50 giriş 08:00 olarak kaydedilir.' },
            { q: 'Servis kullanmayi birakan calisani nasıl cikaririm?', a: 'Çalışan detayından "servis kullaniyor" işaretini kaldirin veya servis eslesmesini silin.' },
            { q: 'Birden fazla güzergaha kayıtlı olabilir miyim?', a: 'Çalışan tipik olarak tek bir güzergaha kaydedilir. Farklı günler için farklı düzenlemeler gerekirse sistem yöneticinize başvurun.' }
        ]
    },
    {
        id: 'veri-yönetimi',
        title: 'Veri Yönetimi',
        icon: Database,
        description: 'Verileri dışa aktarma, ice aktarma, yedekleme ve toplu işlemler. (Sadece sistem yöneticileri görebilir)',
        permission: 'PAGE_DATA_MANAGEMENT',
        link: '/data-management',
        images: [
            { src: '/help-images/help-veri-01.png', caption: 'Veri yönetimi — dışa aktarma, içe aktarma ve toplu işlem seçenekleri' },
            { src: '/help-images/help-veri-02.png', caption: 'Veri yönetimi detay — PDKS yükleme, kuru çalıştırma ve doğrulama sonuçları' }
        ],
        steps: [
            {
                title: 'Sayfaya Erişim',
                description: 'Sol menüden "Veri Yönetimi" seçeneğine tıklayın. Dışa aktarma, ice aktarma ve toplu işlem bölümleri görünür.',
                image: { src: '/help-images/help-veri-01.png', caption: 'Veri yönetimi sayfası' }
            },
            {
                title: 'Veri Dışa Aktarma',
                description: 'Dışa aktarmak istediginiz veri türünü seçin (çalışanlar, puantaj, izinler vb.). Format seçin (JSON veya CSV). "Dışa Aktar" düğmesine tıklayın.'
            },
            {
                title: 'Veri İçe Aktarma',
                description: 'Dosyanizi yükleyin. Sistem önce doğrulama yapar (kuru çalıştırma). Hatalar gösterilir. Sorun yoksa "İçe Aktar" ile verileri kaydedin. Mevcut kayıtlar güncellenir (UPSERT yontemi).'
            },
            {
                title: 'PDKS Verisi Yukleme',
                description: 'Kart okuyucu (PDKS) CSV dosyalarini yukleyerek toplu puantaj verisi aktarabilirsiniz. Sistem mevcut talepleri korur ve sadece ham kayıtları günceller.'
            }
        ],
        tips: [
            { type: 'warning', text: 'İçe aktarma işlemi mevcut kayıtları güncelleyebilir (UPSERT). Once "kuru çalıştırma" ile önizleme yapın, sorun yoksa onayla.' },
            { type: 'info', text: 'PDKS CSV yüklemesinde mevcut onaylanmış talepler korunur. Sistem sadece ham puantaj verilerini günceller.' },
            { type: 'success', text: 'Dışa aktarılan dosyalar ayni formatta geri yüklenebilir. Bu özellik yedekleme ve geri yükleme için kullanışlıdır.' }
        ],
        faq: [
            { q: 'Bu sayfayı göremiyorum?', a: 'PAGE_DATA_MANAGEMENT yetkisi veya SYSTEM_FULL_ACCESS yetkisi gereklidir.' },
            { q: 'İçe aktarma geri alınamaz mi?', a: 'İçe aktarma işlemleri geri alınamaz. Bu yuzden önce "kuru çalıştırma" ile test edin. Önemli işlemlerden önce yedek almayi unutmayin.' },
            { q: 'CSV dosyası hangi formatta olmali?', a: 'Sistem UTF-8 kodlamali CSV bekler. Sutun başlıklari standart formata uygun olmalidir. Ornek dosyayi dışa aktarma ile elde edebilirsiniz.' },
            { q: 'PDKS yükleme mevcut talepleri siler mi?', a: 'Hayır. PDKS yükleme mevcut onaylanmış talepleri (izin, mesai, kartsız giriş) korur. Sadece ham puantaj kayıtları güncellenir.' }
        ]
    },
    {
        id: 'saglik-raporlari',
        title: 'Sağlık Raporları',
        icon: HeartPulse,
        description: 'Sağlık raporu ve hastane ziyareti kayıtları oluşturma, belge yükleme, onay süreci ve puantaj entegrasyonu. (Yöneticiler ve muhasebe görebilir)',
        permission: 'PAGE_HEALTH_REPORTS',
        link: '/health-reports',
        images: [
            { src: '/help-images/help-saglik-01.png', caption: 'Sağlık raporları — özet kartlar, rapor listesi, detay ve onay işlemleri' },
            { src: '/help-images/help-saglik-02.png', caption: 'Sağlık raporları detay — rapor türü, belge yükleme, onay süreci ve puantaj etkisi' }
        ],
        steps: [
            {
                title: 'Sayfaya Erişim',
                description: 'Sol menüden "Sağlık Raporları" seçeneğine tıklayın. Özet kartları (toplam rapor, bekleyen, onaylanan), süzgeçler ve rapor listesi görürsünüz.',
                image: { src: '/help-images/help-saglik-01.png', caption: 'Sağlık raporları sayfası' }
            },
            {
                title: 'Yeni Sağlık Raporu Oluşturma',
                description: 'Talepler sayfasından veya doğrudan bu sayfadan yeni sağlık raporu oluşturun. Rapor türü seçin: Sağlık Raporu (tam gun) veya Hastane Ziyareti (saat bazli). Tarih/saat, açıklama ve belge yükleyin.'
            },
            {
                title: 'Belge Yukleme',
                description: 'Sağlık raporunuzun dijital kopyasini yükleyin. Desteklenen formatlar: PDF, JPEG, PNG. Birden fazla belge ekleyebilirsiniz. Belgeler güvenli depolamada saklanır.'
            },
            {
                title: 'Onay Süreci',
                description: 'Sağlık raporları yönetici onayına gonder. Onaylanan raporlar puantajda otomatik yansır: sağlık raporu günleri çalışma hedefinden düşülür.'
            }
        ],
        tips: [
            { type: 'info', text: 'Sağlık raporu günleri aylık çalışma hedefinden düşülür. Ornegin 22 günhedef, 3 günsağlık raporu = 19 günhedef.' },
            { type: 'warning', text: 'Hastane ziyareti saat bazli çalışır. Tam günsağlık raporundan farklı olarak sadece belirtilen saat aralığını kapsar.' },
            { type: 'success', text: 'Onaylanan sağlık raporları takvimde pembe renkte gösterilir ve aylık özette "sağlık raporu günleri" olarak sayılır.' }
        ],
        faq: [
            { q: 'Bu sayfayı göremiyorum?', a: 'PAGE_HEALTH_REPORTS yetkisi gereklidir. Bu yetki genellikle ROLE_ADMIN ve ROLE_ACCOUNTING rollerine tanımlıdır.' },
            { q: 'Sağlık raporu ile hastane ziyareti arasındaki fark nedir?', a: 'Sağlık raporu tam günkaynaklidir (is günü boyunca). Hastane ziyareti saat bazlidir (ornegin 10:00-14:00 arası).' },
            { q: 'Belge yüklemeden rapor oluşturabilir miyim?', a: 'Evet, belge yükleme zorunlu değildir ancak onay sürecini hızlandırmak için rapor belgesi eklemeniz önerilir.' },
            { q: 'Onaylanan rapor puantajimi nasıl etkiler?', a: 'Sağlık raporu günleri puantajda özel durum olarak kaydedilir. Çalışma hedefinden düşülür ve aylık özette ayrica gösterilir.' }
        ]
    },
    {
        id: 'ozel-izinler',
        title: 'Özel İzinler',
        icon: Gift,
        description: 'Doğum günü izni, özel günizinleri ve diger özel izin haklari. (Yöneticiler ve sistem yöneticileri görebilir)',
        permission: 'PAGE_SPECIAL_LEAVES',
        link: '/special-leaves',
        images: [
            { src: '/help-images/help-ozel-izin-01.png', caption: 'Özel izinler — izin türü listesi, başvuru durumu ve özet bilgiler' },
            { src: '/help-images/help-ozel-izin-02.png', caption: 'Özel izinler detay — başvuru formu, belge yükleme ve onay durumu' }
        ],
        steps: [
            {
                title: 'Sayfaya Erişim',
                description: 'Sol menüden "Özel İzinler" seçeneğine tıklayın. Özel izin türleri, başvuru durumunuz ve özet bilgiler görünür.',
                image: { src: '/help-images/help-ozel-izin-01.png', caption: 'Özel izinler sayfası' }
            },
            {
                title: 'Özel İzin Türleri',
                description: 'Doğum günü izni (doğum ayınızda 1 gun), evlilik izni, doğum izni, vefat izni gibi özel durumlara özel izin haklari bulunur. Her birinin süresi ve koşulları farklıdir.'
            },
            {
                title: 'Başvuru Oluşturma',
                description: 'İlgili izin türü için "Başvur" düğmesine tıklayın. Tarih aralığını seçin, gerekli belgeleri yükleyin ve gönderin. Başvuru onay sürecine girer.'
            },
            {
                title: 'Belge Yukleme',
                description: 'Bazi özel izin türleri belge gerektirir (evlilik cüzdanı, doğum belgesi vb.). Desteklenen formatlar: PDF, JPEG, PNG. Belgesiz başvurular reddedilebilir.'
            },
            {
                title: 'Onay ve Takip',
                description: 'Başvurunuz ilgili yöneticiye yönlendirilir. Onay/red durumunu sayfadan takip edebilirsiniz. Onaylanan özel izinler takvimde gösterilir.'
            }
        ],
        tips: [
            { type: 'info', text: 'Doğum günü izni sadece doğum ayınızda kullanılabilir. Ana sayfadaki pembe kartta kalan hakkınız gösterilir.' },
            { type: 'warning', text: 'Bazi özel izin türleri belge gerektirir. Belgesiz başvurular reddedilebilir veya askiya alinabilir.' },
            { type: 'success', text: 'Özel izin haklari yıllık olarak yenilenir. Kullanilmayan haklar bir sonraki yila devretmez.' }
        ],
        faq: [
            { q: 'Bu sayfayı göremiyorum?', a: 'PAGE_SPECIAL_LEAVES yetkisi gereklidir. Sistem yöneticinize başvurun.' },
            { q: 'Doğum günü iznimi hangi ay kullanabilirim?', a: 'Sadece doğum ayınızda kullanabilirsiniz. Ornegin doğum tarihiniz 15 Mayis ise Mayis ayi boyunca kullanabilirsiniz.' },
            { q: 'Özel izin haklari devredilir mi?', a: 'Hayır, kullanilmayan özel izin haklari bir sonraki yila devretmez. Her yil sıfırlanir.' },
            { q: 'Evlilik izni için hangi belgeler gerekli?', a: 'Evlilik cüzdanı fotokopisi veya evlilik belgesi gereklidir. Belgeyi başvuru sırasında yükleyin.' }
        ]
    },
    {
        id: 'debug',
        title: 'Hata Ayiklama',
        icon: Bug,
        description: 'Sistem hata logları, performans izleme ve sorun giderme araclari. (Sadece sistem yöneticileri görebilir)',
        permission: 'PAGE_DEBUG',
        link: '/debug',
        images: [
            { src: '/help-images/help-debug-01.png', caption: 'Hata ayiklama — hata logları, performans metrikleri ve sorun giderme araclari' },
            { src: '/help-images/help-debug-02.png', caption: 'Puantaj hata ayıklayıcı — detay ve hesaplama sonuçları' }
        ],
        steps: [
            {
                title: 'Sayfaya Erişim',
                description: 'Sol menüden "Hata Ayiklama" seçeneğine tıklayın. Hata logları, performans metrikleri ve sorun giderme araclari görünür.',
                image: { src: '/help-images/help-debug-01.png', caption: 'Hata ayiklama sayfası' }
            },
            {
                title: 'Hata Loglari',
                description: 'Son hataları tarih ve ciddiyet derecesine gore inceleyin. Her log kaydında hata mesaji, kaynak dosya, zaman damgasi ve ilgili kullanici bilgisi bulunur.'
            },
            {
                title: 'Performans Izleme',
                description: 'Sistem yanit sureleri, veritabanı sorgu performansi ve bellek kullanımı gibi metrikleri izleyin.'
            },
            {
                title: 'Sorun Giderme',
                description: 'Belirli bir çalışanveya işlem için detayli iz surme (log takibi) yapabilirsiniz. Tarih aralığı ve çalışansüzgeçlerini kullanın.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Bu sayfa teknik iceriktedir ve yanlış işlemler sistemi etkileyebilir. Sadece yetkili teknik personel tarafından kullanilmalidir.' },
            { type: 'info', text: 'Hata logları sorun giderme için önemlidir. Tekrarlayan hataları tespit ederek kok neden analizine yardimci olur.' },
            { type: 'success', text: 'Performans metrikleri yavaş sayfaları veya işlemlerin nedenini bulmak için kullanışlıdır.' }
        ],
        faq: [
            { q: 'Bu sayfayı göremiyorum?', a: 'PAGE_DEBUG yetkisi veya SYSTEM_FULL_ACCESS yetkisi gereklidir. Bu sayfa sadece teknik yöneticiler içindir.' },
            { q: 'Hata loglarıni temizleyebilir miyim?', a: 'Loglar otomatik olarak belirli bir süresonra temizlenir. Manuel silme önerilmez çünkü geçmiş hataların analizi önemlidir.' },
            { q: 'Performans sorununu nasıl tespit ederim?', a: 'Yanit süresi yuksek olan erişim noktalarini inceleyin. Veritabani sorgu süresi ve bellek kullanımıni karsilastirin.' },
            { q: 'Bir çalışanın işlemlerini takip edebilir miyim?', a: 'Evet, çalışansüzgeçini kullanarak belirli bir kişinin tüm işlem loglarıni görüntüleyebilirsiniz.' }
        ]
    },
    {
        id: 'mesai-takibi',
        title: 'Mesai Takibi',
        icon: Timer,
        description: 'Ekip puantaj tablosu, detayli analiz sekmeleri, katilim oranları, ek mesai dagilimi, yemek-mesai iliskişi, izin oranları, departman karşılaştırması ve kişi detay cekmecesi. (Yöneticiler ve sistem yöneticileri görebilir)',
        permission: 'PAGE_ATTENDANCE',
        link: '/attendance',
        images: [
            { src: '/help-images/help-mesai-01.png', caption: 'Mesai takibi ekip tablosu — çalışan puantaj listesi, durum sütunları ve işlem düğmeleri' },
            { src: '/help-images/help-mesai-02.png', caption: 'Mesai takibi tablo sağ sütunlar — ek mesai, mola, durum ve işlem detayları' },
            { src: '/help-images/help-mesai-03.png', caption: 'Mesai takibi analitik modu — katılım, mesai, yemek ve izin grafikleri' },
            { src: '/help-images/help-mesai-04.png', caption: 'Mesai takibi analitik detay — departman karşılaştırması ve sıralama tablosu' }
        ],
        steps: [
            {
                title: 'Ekip Puantaj Tablosu',
                description: 'Sol menüden "Mesai Takibi" seçeneğine tıklayın. Ekibinizdeki çalışanların günlük puantaj tablosu görürsünüz: giriş/çıkış saatleri, çalışma süresi, ek mesai, mola, durum ve işlemler.',
                image: { src: '/help-images/help-mesai-01.png', caption: 'Ekip puantaj tablosu' }
            },
            {
                title: 'Ekip Analizleri Sekmesi',
                description: 'Tablo üzerindeki "Analizler" sekmesine tıklayın. Ekibinizin toplu performans metrikleri gösterilir. Bu bölüm 6 ana analiz içerir:',
                image: { src: '/help-images/help-mesai-02.png', caption: 'Ekip analiz görünümu' }
            },
            {
                title: 'Katilim Orani Analizi',
                description: 'Seçilen dönemdeki ekip katilim orani yuzde olarak hesaplanır. Günlük, haftalık ve aylık bazda katilim trendi grafiği gösterilir. Devamsiz, izinli ve raporlu çalışansayilari ayrica belirtilir.'
            },
            {
                title: 'Ek Mesai Dagilim Analizi',
                description: 'Hafta sonu ve hafta içi ek mesai analizi ayri ayri sunulur. Çalışan bazında mesai dagilimi çubuk grafikle, toplam mesai saatleri ile gösterilir. Planli, algılanan ve manuel mesai kaynaklari ayrimi yapılır.'
            },
            {
                title: 'Yemek-Mesai Iliskişi',
                description: 'Yemek siparişi veren çalışanların mesai durumları karşılaştırılır. Mesai günlerindeki yemek sipariş oranları, mesaisiz günlerle karşılaştırmalı olarak sunulur. Bu analiz iş günü doğrulama için faydalidir.'
            },
            {
                title: 'İzin Kullanim Oranlari',
                description: 'Ekip genelinde izin kullanim dagilimi gösterilir: yıllık izin, mazeret izni, sağlık raporu ve diger izin türleri ayri ayri analiz edilir. Kalan bakiye ortalamasi ve dönemsellhesaplama sunulur.'
            },
            {
                title: 'Departman Karşılaştırması',
                description: 'Ekibinizin performans metrikleri (katilim orani, ortalama çalışma süresi, mesai orani) diger departmanlarla karşılaştırılır. 3 ek sütun ile karşılaştırma yapılır: departman ortalamasi, şirket ortalamasi ve sapma.'
            },
            {
                title: 'Siralama Tablosu ve Kisi Detay Cekmecesi',
                description: 'Çalışanlar performans metriklerine gore sıralanır. 3 ek sütun: katilim puani, mesai puani, genel puan. Herhangi bir satira tıklayarak kişi detay cekmecesini acin. Cekmecede katilim detayları, ek mesai geçmişi ve yemek siparişleri bölüm bölüm gösterilir.'
            }
        ],
        tips: [
            { type: 'info', text: 'Ekip analizleri yöneticinin doğrudan ve dolaylı olarak yönettiği tüm çalışanlari kapsar. İkincil yönetici olarak sadece ek mesai ile ilgili verileri görürsünüz.' },
            { type: 'success', text: 'Kisi detay cekmecesini acarak bir çalışanın aylık katilim, mesai ve yemek bilgilerini tek ekranda inceleyebilirsiniz.' },
            { type: 'info', text: 'Departman karşılaştırması ekibinizin şirket genelindeki konumunu gösterir. Sapma sütunu ortalamanin ne kadar üzerinde/altında oldugünüzu belirtir.' },
            { type: 'warning', text: 'Kilitli mali dönemlerdeki puantaj kayıtları düzenlenemez. Düzenleme gerektiren durumlarda sistem yöneticisine başvurun.' }
        ],
        faq: [
            { q: 'Bu sayfayı göremiyorum?', a: 'PAGE_ATTENDANCE yetkisi gereklidir. Bu yetki genellikle yönetici rollerine tanımlıdır.' },
            { q: 'Ekip analizlerinde hangi dönemi görüyorum?', a: 'Varsayılan olarak mevcut mali dönem gösterilir. Tarih süzgeçini kullanarak farklı dönemleri secebilirsiniz.' },
            { q: 'Departman karşılaştırması nasıl hesaplanıyor?', a: 'Her departmanin katilim orani, ortalama çalışma süresi ve mesai orani hesaplanır. Ekibinizin değerleri bu ortalamalara gore karşılaştırılır.' },
            { q: 'Kisi detay cekmecesinde ne görüyorum?', a: 'Seçilen çalışanın 3 bölümu: katilim detayları (günlük giriş/çıkış), ek mesai geçmişi (onaylanan/bekleyen/reddedilen) ve yemek siparişleri.' },
            { q: 'İkincil yönetici olarak neleri görebilirim?', a: 'İkincil yönetici olarak sadece ek mesai ile ilgili verileri görürsünüz. Katilim, izin ve diger analizler birincil yöneticiye özeldir.' },
            { q: 'Puantaj kayıtlarıni düzenleyebilir miyim?', a: 'Kilitli olmayan dönemlerdeki kayıtlar üzerinde işlem yapabilirsiniz. Kilitli dönemlerin kayıtları değiştirilemez.' }
        ]
    },
    {
        id: 'program-yönetimi',
        title: 'Program Yönetimi',
        icon: Server,
        description: 'Dis program entegrasyonlari, uygulama arayuzu (API) anahtar yönetimi, cihaz takibi ve erişim logları. (Sadece sistem yöneticileri görebilir)',
        permission: 'PAGE_PROGRAM_MANAGEMENT',
        link: '/programs',
        images: [
            { src: '/help-images/help-program-01.png', caption: 'Program yönetimi — program listesi, detay paneli, cihazlar ve erişim logları' },
            { src: '/help-images/help-program-02.png', caption: 'Program yönetimi detay — API anahtarı, cihaz listesi ve erişim log detayları' }
        ],
        steps: [
            {
                title: 'Sayfaya Erişim',
                description: 'Sol menüden "Program Yönetimi" seçeneğine tıklayın. Sol listede programlar, sağ panelde secili programın detayları gösterilir.',
                image: { src: '/help-images/help-program-01.png', caption: 'Program yönetimi sayfası' }
            },
            {
                title: 'Yeni Program Ekleme',
                description: '"Yeni Program" düğmesine tıklayın. Program adi, türü ve açıklamasini girin. Oluştürüldiginda otomatik API anahtari üretilir.'
            },
            {
                title: 'API Anahtari Yönetimi',
                description: 'Her programın benzersiz bir API anahtari vardır. Anahtar varsayılan olarak gizli gösterilir. Goz simgesine tıklayarak gorun, kopyala düğmesi ile panoya kopyalayin. Güvenlik için anahtari yenileyebilirsiniz (mevcut bağlantılar kesilir).'
            },
            {
                title: 'Cihaz Takibi',
                description: '"Cihazlar" sekmesinde programa bağlı cihazlar listelenir. Her cihaz için benzersiz donanım kimliği (HWID), durum, son bağlantı tarih/saati ve sürüm bilgisi görülür.'
            },
            {
                title: 'Erişim Loglari',
                description: 'Erişim logları zaman sıralamasıyla gösterilir. Her kayıt: tarih/saat, cihaz kimliği, işlem sonucu ve detay içerir. Renk kodlu sonuçlar sorun gidermeyi kolaylaştırır.'
            }
        ],
        tips: [
            { type: 'info', text: 'Sol listeden program seçerek sağ panelde tümdetayları (API anahtari, cihaz listesi, erişim logları) görüntüleyebilirsiniz.' },
            { type: 'warning', text: 'Program silme işlemi ilişkili tüm cihaz kayıtlarıni, erişim loglarıni ve API anahtarini kalıcı olarak kaldırır. Silme yerine "Pasif" durumuna geçirmeyi tercih edin.' },
            { type: 'warning', text: 'API anahtarini yenilemek mevcut tümbağlantılar anında keser. Yenileme öncesi bağlı cihaz sayısıni kontrol edin.' },
            { type: 'success', text: 'Erişim logları sorun giderme için çok kullanışlıdır. Başarısız bağlantı denemeleri kırmızı, uyarılar turuncu renkte vurgulanir.' }
        ],
        faq: [
            { q: 'Bu sayfayı göremiyorum?', a: 'PAGE_PROGRAM_MANAGEMENT yetkisi gereklidir. Bu yetki genellikle ROLE_ADMIN rolune tanımlıdır.' },
            { q: 'Silinen programın cihaz kayıtları geri gelir mi?', a: 'Hayır. Program silme kalıcıdir. Geri alma yoktur. Silme yerine pasife alma önerilir.' },
            { q: 'API anahtari güvenli mi?', a: 'API anahtari sunucu tarafinda şifrelenmis olarak saklanır. Ekranda varsayılan olarak gizli gösterilir. Anahtari güvenli ortamda saklayin, duz metin olarak paylasmahyin.' },
            { q: 'HWID_BLOCKED ne anlama gelir?', a: 'Bir cihazin donanım kimliği manuel olarak engellenmiştir. O cihazdan gelen tümbağlantı denemeleri reddedilir ve loglanir.' },
            { q: 'Pasif programa baglanan cihaz ne olur?', a: 'PROGRAM_INACTIVE hatasi alır. Programi tekrar aktif yaptığınızda bağlantılar otomatik çalışır, cihaz tarafinda değişiklik gerekmez.' }
        ]
    }
];

export default helpContent;
