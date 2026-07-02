import {
    BarChart3, Bell, Briefcase, Bug, Calculator, Calendar, CalendarDays, CalendarRange, CheckSquare, Clock, Contact, Database, Gift, HeartPulse, Megaphone, MessageSquare, Network, Package, PartyPopper, PieChart, Server, Shield, ShoppingCart, Timer, UserCheck, Users, Utensils
} from 'lucide-react';

const helpContent = [
{
    id: 'giris-cikis',
    title: 'Ana Sayfa ve Giriş/Çıkış',
    icon: Clock,
    description: 'Kart okutma ile giriş/çıkış, canlı durum kartları, mola takibi, puantaj grafiği, haftalık fazla mesai limiti ve aylık performans özeti. (Tüm çalışanlar görebilir)',
    permission: null,
    link: '/',
    images: [
        { src: '/help-images/help-login-01.png', caption: 'Giriş ekranı — kullanıcı adı/e-posta ve şifre ile oturum açma' },
        { src: '/help-images/help-giris-01.png', caption: 'Ana sayfa tam görünüm — özet kartları, puantaj grafiği, son aktiviteler ve yaklaşan etkinlikler' },
        { src: '/help-images/help-giris-02.png', caption: 'Üst kartlar — Bugün Çalışma, Kalan Mola, Fazla Mesai, İzin Durumu ve haftalık fazla mesai limit çubuğu' },
        { src: '/help-images/help-giris-03.png', caption: 'Puantaj grafiği — haftalık/aylık/yıllık görünüm ve mola gösterim seçeneği' },
        { src: '/help-images/help-giris-04.png', caption: 'Aylık performans özeti, son aktiviteler ve yaklaşan etkinlikler bölümü' }
    ],
    steps: [
        {
            title: 'Sisteme Giriş Yapma',
            description: 'Tarayıcıdan portala girin, kullanıcı adınızı (veya e-posta adresinizi) ve şifrenizi yazarak oturum açın. Giriş sonrası ana sayfa açılır.',
            image: { src: '/help-images/help-login-01.png', caption: 'Giriş ekranı' }
        },
        {
            title: 'Kart Okutma ile Mesai Başlatma',
            description: 'İşe geldiğinizde kartınızı kart okuyucuya okutun; giriş saatiniz otomatik kaydedilir ve mesainiz başlar. Servis kullanan çalışanlarda giriş/çıkış saatleri servis toleransı (yaklaşık 15 dakika) içinde vardiya sınırına yuvarlanır.',
            image: { src: '/help-images/help-giris-01.png', caption: 'Giriş sonrası ana sayfa görünümü' }
        },
        {
            title: 'Üst Özet Kartları',
            description: 'Ana sayfanın üstünde Bugün Çalışma (toplam süre), Kalan Mola (kullanılan/hak), Fazla Mesai (onaylanan/bekleyen) ve İzin Durumu (yıllık ve mazeret bakiyesi) kartları bulunur. Doğum ayınızda ek olarak Doğum Günü İzni kartı görünür. Veriler yaklaşık 60 saniyede bir otomatik güncellenir.',
            image: { src: '/help-images/help-giris-02.png', caption: 'Üst özet kartları ve haftalık limit çubuğu' }
        },
        {
            title: 'Haftalık Fazla Mesai Limit Çubuğu',
            description: 'Kartların altındaki çubuk, Pazartesi-Pazar sabit takvim haftası içindeki onaylı ve bekleyen fazla mesai toplamınızı limitinize (varsayılan 30 saat) oranlar. Her Pazartesi sıfırlanır; limit dolduğunda yeni fazla mesai talebi oluşturamazsınız.'
        },
        {
            title: 'Puantaj Grafiği',
            description: 'Grafik bölgesinde günlük çalışma sürelerinizi haftalık, aylık veya yıllık görünümde inceleyebilirsiniz. Mola gösterim seçeneği ile mola sürelerini grafiğe ekleyip çıkarabilirsiniz.',
            image: { src: '/help-images/help-giris-03.png', caption: 'Haftalık/aylık/yıllık puantaj grafiği' }
        },
        {
            title: 'Aylık Performans, Son Aktiviteler ve Yaklaşan Etkinlikler',
            description: 'Alt bölümde her mali dönem (önceki ayın 26sı - ayın 25i) için hedef çalışma süresi, gerçekleşen süre ve bakiye gösterilir; oklarla aylar arasında gezinebilirsiniz. Son aktiviteler listesinde giriş/çıkış hareketleriniz, yaklaşan etkinliklerde tatiller, izinler, mesai atamaları ve dış görevler yer alır.',
            image: { src: '/help-images/help-giris-04.png', caption: 'Aylık performans ve etkinlik listeleri' }
        },
        {
            title: 'Çıkış Yapma',
            description: 'Mesai bitiminde kartınızı tekrar okutun. Çıkış yapmazsanız kaydınız gece yarısı otomatik görevle kapatılır ve yanlış potansiyel mesai oluşabilir. Unutursanız Talepler sayfasından Kartsız Giriş Talebi ile düzeltebilirsiniz.'
        }
    ],
    tips: [
        { type: 'info', text: 'Üç bağımsız tolerans mekanizması vardır: (1) Servis toleransı (~15 dk) yalnızca servis kullananlar için giriş/çıkışı vardiya sınırına yuvarlar. (2) Normal tolerans (30 dk) vardiya sonrası penceredir; önce mesai eksiğiniz kapatılır, kalan süre fazla mesai olur. (3) Minimum fazla mesai eşiği (30 dk) küme bazlıdır: aynı günün mesai parçaları 3 saatten büyük boşluklarla kümelere ayrılır, eşiğin altında kalan küme sıfırlanır.' },
        { type: 'warning', text: 'Çıkış yapmadan ayrılmayın! Açık kalan kayıt gece yarısı otomatik kapatılır; bu durum sahte potansiyel mesai ve hatalı puantaj oluşturabilir.' },
        { type: 'success', text: 'Kartınızı unuttuysanız Talepler sayfasından Kartsız Giriş Talebi oluşturun. Geriye dönük 2 mali ay içindeki tarihler için verilebilir.' },
        { type: 'info', text: 'Sayfa verileri yaklaşık 60 saniyede bir akıllı güncelleme ile yenilenir. Sekme arka plandayken güncelleme durur, sekmeye döndüğünüzde anında yenilenir.' }
    ],
    faq: [
        { q: 'Kart okutmayı unuttum, ne yapmalıyım?', a: 'Talepler sayfasından Kartsız Giriş Talebi oluşturun. Giriş/çıkış saatlerinizi belirtin; talep birincil yöneticinize gider ve onaylandığında puantaj kaydınız otomatik oluşturulur.' },
        { q: 'Fazla mesai nasıl algılanır?', a: 'Vardiya sonrası (tolerans penceresi sonrasında), vardiya öncesi erken giriş veya tatil günü çalışmalarında otomatik potansiyel mesai oluşur. Aynı gündeki mesai parçaları kümelere ayrılır; 30 dakikanın altında kalan küme sıfırlanır ve talep edilemez.' },
        { q: 'Mola sürem neden aşıldı görünüyor?', a: 'Gün içindeki her çıkış-giriş aralığı mola olarak sayılır. Günlük mola hakkınız aşıldığında aşan kısım net çalışma sürenizden düşülür.' },
        { q: 'Aylık bakiyem negatif, ne anlama geliyor?', a: 'O mali dönemde hedef çalışma süresinin altında kaldığınızı gösterir. Geç kalma, erken çıkış veya eksik günlerden kaynaklanabilir.' },
        { q: 'Mali dönem hangi tarihleri kapsar?', a: 'Önceki ayın 26sından ilgili ayın 25ine kadar olan dönemi kapsar. Aylık performans özeti bu döneme göre hesaplanır.' },
        { q: 'Gece yarısını geçen mesaim nasıl hesaplanır?', a: 'Gece 00:00 sonrasına sarkan kayıtlar otomatik görevle bölünür: mevcut kayıt gün sonunda kapatılır, ertesi gün için yeni kayıt açılır.' }
    ]
},
{
    id: 'profil',
    title: 'Profilim',
    icon: Users,
    description: 'Kişisel bilgiler, iletişim ve acil durum bilgileri, bildirim tercihleri ve şifre yönetimi. (Tüm çalışanlar görebilir)',
    permission: null,
    link: '/profile',
    images: [
        { src: '/help-images/help-profil-01.png', caption: 'Profilim sekmesi — kişisel bilgiler ve salt okunur kurumsal alanlar' },
        { src: '/help-images/help-profil-02.png', caption: 'İletişim sekmesi — adres ve acil durum kişi bilgileri' },
        { src: '/help-images/help-profil-03.png', caption: 'Bildirimler sekmesi — bildirim tercihleri aç/kapat düğmeleri' },
        { src: '/help-images/help-profil-04.png', caption: 'Güvenlik sekmesi — şifre değiştirme formu' }
    ],
    steps: [
        {
            title: 'Profil Sayfasına Erişim',
            description: 'Sol menüden "Profilim" seçeneğine veya sağ üstteki avatar simgesine tıklayın. Sayfada dört sekme bulunur: Profilim (kişisel bilgiler), İletişim (adres ve acil durum), Bildirimler (tercihler) ve Güvenlik (şifre yönetimi).',
            image: { src: '/help-images/help-profil-01.png', caption: 'Profil sayfası genel görünüm' }
        },
        {
            title: 'Kişisel Bilgiler',
            description: 'Profilim sekmesinde ad-soyad ve kişisel bilgilerinizi görürsünüz. Kurumsal bilgiler (işe başlama tarihi, departman, sicil numarası) salt okunurdur ve yönetici tarafından güncellenir. TC kimlik numaranız KVKK gereği maskelenmiş gösterilir.',
            image: { src: '/help-images/help-profil-01.png', caption: 'Kişisel ve kurumsal bilgi alanları' }
        },
        {
            title: 'İletişim Bilgileri',
            description: 'İletişim sekmesinde telefon, adres ve acil durum iletişim bilgilerinizi (kişi adı ve telefonu) güncelleyebilirsiniz. Acil durum bilgileri iş güvenliği açısından önemlidir, güncel tutun.',
            image: { src: '/help-images/help-profil-02.png', caption: 'İletişim ve acil durum bilgileri' }
        },
        {
            title: 'Bildirim Tercihleri',
            description: 'Bildirimler sekmesinde her bildirim türü için aç/kapat düğmesi bulunur. Kapattığınız türlerden bildirim almazsınız; değişiklikler anında kaydedilir.',
            image: { src: '/help-images/help-profil-03.png', caption: 'Bildirim tercihleri' }
        },
        {
            title: 'Şifre Değiştirme',
            description: 'Güvenlik sekmesinde mevcut şifrenizi ve yeni şifrenizi girerek şifrenizi değiştirebilirsiniz. Şifreniz sistem yöneticisi tarafından sıfırlandıysa ilk girişte yeni şifre belirlemeniz istenir.',
            image: { src: '/help-images/help-profil-04.png', caption: 'Şifre değiştirme formu' }
        }
    ],
    tips: [
        { type: 'info', text: 'Ad, soyad, departman, pozisyon, işe başlama tarihi ve sicil numarası yönetici tarafından güncellenir; profil sayfanızda bu alanlar salt okunurdur.' },
        { type: 'warning', text: 'İzin ve mesai onay/red bildirimlerini kapatmamanız önerilir; aksi halde talep durumunuzdaki değişikliklerden habersiz kalabilirsiniz.' },
        { type: 'info', text: 'TC kimlik numarası KVKK kapsamında hassas veridir; ekranda maskelenmiş gösterilir ve düzenlemek için özel yetki gerekir.' },
        { type: 'success', text: 'Acil durum iletişim bilgilerinizi güncel tutun; olası bir durumda işvereninizin size ulaşacağı kişi bu kayıttır.' }
    ],
    faq: [
        { q: 'Departman veya pozisyon bilgimi nasıl değiştiririm?', a: 'Bu bilgiler yönetici tarafından Çalışan Yönetimi sayfasından güncellenir. İK birimine veya yöneticinize başvurun.' },
        { q: 'Şifremi unuttum, ne yapmalıyım?', a: 'Sistem yöneticinize başvurun. Şifreniz sıfırlanır ve ilk girişte yeni şifre belirlemeniz istenir.' },
        { q: 'TC kimlik numaram neden maskeli görünüyor?', a: 'KVKK kapsamında hassas veri olduğu için maskelenmiş gösterilir. Düzeltme gerekiyorsa yetkili bir yöneticiye başvurun.' },
        { q: 'Profil fotoğrafı yükleyebilir miyim?', a: 'Şu an profil fotoğrafı yükleme desteklenmemektedir. Avatar, adınızın ve soyadınızın baş harflerinden otomatik oluşturulur.' },
        { q: 'Bildirim tercihlerimi değiştirirsem eski bildirimlerim silinir mi?', a: 'Hayır. Tercihler yalnızca bundan sonra üretilecek bildirimleri etkiler; mevcut bildirim geçmişiniz korunur.' }
    ]
},
{
    id: 'bildirim-sistemi',
    title: 'Bildirim Sistemi',
    icon: Bell,
    description: 'Talep onay/red bildirimleri, bildirim çanı, tercih yönetimi ve yönetim duyuruları için sistem mesajı pop-upları. (Tüm çalışanlar görebilir)',
    permission: null,
    link: '/profile',
    images: [
        { src: '/help-images/help-profil-03.png', caption: 'Bildirim tercihleri — hangi bildirim türlerini almak istediğinizi seçebilirsiniz' }
    ],
    steps: [
        {
            title: 'Bildirim Çanı',
            description: 'Üst menü çubuğundaki çan simgesine tıklayarak bildirimlerinizi görürsünüz. Okunmamış bildirim varsa çanın yanında kırmızı sayaç görünür.'
        },
        {
            title: 'Bildirim Türleri',
            description: 'Sistem izin onay/red, fazla mesai onay/red, vekalet talepleri, yükseltme (eskalasyon) uyarıları ve sistem duyuruları gibi türlerde uygulama içi bildirim gönderir. Her tür farklı renk ve simge ile ayırt edilir.'
        },
        {
            title: 'Bildirim Tercihlerini Ayarlama',
            description: 'Profilim sayfasındaki Bildirimler sekmesinde her tür için aç/kapat düğmesi bulunur. Kapattığınız türlerden bildirim almazsınız; değişiklikler anında kaydedilir.',
            image: { src: '/help-images/help-profil-03.png', caption: 'Bildirim tercihleri sekmesi' }
        },
        {
            title: 'Bildirimi Okundu İşaretleme',
            description: 'Listedeki bir bildirime tıkladığınızda okundu olarak işaretlenir ve ilgili sayfaya yönlendirilirsiniz. Toplu işaretleme seçeneği ile tüm bildirimleri tek seferde temizleyebilirsiniz.'
        },
        {
            title: 'Sistem Mesajları (Duyuru Pop-upları)',
            description: 'Yönetimin yayınladığı duyurular, uygulamaya girişinizden sonra pencere (pop-up) olarak açılır. "Bir daha gösterme" seçeneği kalıcıdır — o duyuru size bir daha gösterilmez. "Kapat" seçeneği ise yalnızca o oturum için geçerlidir; sonraki açılışta duyuru tekrar görünebilir.'
        }
    ],
    tips: [
        { type: 'info', text: 'Bildirimler uygulama içidir ve yaklaşık 60 saniyede bir akıllı güncelleme ile kontrol edilir. E-posta bildirimi gönderilmez.' },
        { type: 'warning', text: 'Tüm bildirim türlerini kapatırsanız önemli onay/red bilgilerini kaçırabilirsiniz. En azından izin ve mesai bildirimlerini açık tutmanızı öneririz.' },
        { type: 'success', text: 'Yöneticiniz değiştiğinde bekleyen talepleriniz otomatik olarak yeni yöneticinize devredilir; bu durumda hem siz hem eski hem de yeni yöneticiniz bildirim alır.' },
        { type: 'info', text: 'Önemli bir duyuruyu daha sonra tekrar görmek istiyorsanız pop-upta "Kapat" seçeneğini kullanın; "Bir daha gösterme" seçtiğinizde duyuru kalıcı olarak kapanır.' }
    ],
    faq: [
        { q: 'Bildirimler e-posta olarak da gönderiliyor mu?', a: 'Hayır, bildirimler yalnızca uygulama içinde gösterilir. Uygulamaya düzenli giriş yaparak bildirimlerinizi kontrol edin.' },
        { q: 'Neden bildirim almıyorum?', a: 'Profilinizdeki bildirim tercihlerini kontrol edin; ilgili tür kapalı olabilir. Ayrıca sekme arka plandayken bildirim kontrolü duraklar, sekmeye döndüğünüzde güncellenir.' },
        { q: 'Sistem mesajı pop-upını yanlışlıkla kapattım, tekrar görebilir miyim?', a: '"Kapat" seçtiyseniz duyuru sonraki oturum açılışınızda tekrar gösterilir. "Bir daha gösterme" seçtiyseniz o duyuru size bir daha açılmaz.' },
        { q: 'Eski bildirimlerimi görebilir miyim?', a: 'Evet, bildirim listesinde aşağı kaydırarak geçmiş bildirimlerinizi görüntüleyebilirsiniz.' },
        { q: 'Bildirimler ne sıklıkla güncellenir?', a: 'Yaklaşık 60 saniyede bir akıllı güncelleme döngüsüyle kontrol edilir. Sayfayı yenileyerek de anında güncelleyebilirsiniz.' }
    ]
},
{
    id: 'izin-talepleri',
    title: 'İzin Talepleri',
    icon: CalendarDays,
    description: 'Yıllık izin, mazeret izni, doğum günü izni, yasal izinler ve avans izin başvurusu; bakiye takibi ve onay süreci. (Tüm çalışanlar görebilir)',
    permission: null,
    link: '/requests',
    images: [
        { src: '/help-images/help-talepler-01.png', caption: 'Kendi Taleplerim — talep listesi ve tür filtreleri' },
        { src: '/help-images/help-talepler-04.png', caption: 'Yeni Talep penceresi — talep türü seçimi' }
    ],
    steps: [
        {
            title: 'İzin Bakiyesini Kontrol Etme',
            description: 'Talep oluşturmadan önce bakiyenizi kontrol edin. Ana sayfadaki İzin Durumu kartında yıllık izin (gün) ve mazeret izni (saat) bakiyeniz özetlenir; Talepler sayfasında daha ayrıntılı bilgi bulunur.',
            image: { src: '/help-images/help-talepler-01.png', caption: 'Kendi Taleplerim listesi' }
        },
        {
            title: 'Yeni Talep Oluşturma',
            description: 'Talepler sayfasında "Yeni Talep" düğmesine tıklayın. Açılan pencerede talep türleri listelenir: İzin Talebi, Fazla Mesai, Şirket Dışı Görev, Yemek Talebi, Kartsız Giriş, Sağlık Raporu ve Hastane Ziyareti. İzin için "İzin Talebi" seçin.',
            image: { src: '/help-images/help-talepler-04.png', caption: 'Talep türü seçim penceresi' }
        },
        {
            title: 'İzin Türünü ve Tarihleri Seçme',
            description: 'İzin türünü (yıllık izin, mazeret izni, doğum günü izni, yasal izinler veya avans izin) seçin, başlangıç/bitiş tarihlerini belirleyin ve açıklamanızı yazıp gönderin. Mazeret izni saat bazlı çalışır: yıllık 18 saat hak, günde en fazla 4,5 saat.'
        },
        {
            title: 'Onay Süreci',
            description: 'Talebiniz otomatik olarak birincil yöneticinize yönlendirilir. Onay veya red sonrası uygulama içi bildirim alırsınız.'
        },
        {
            title: 'İptal ve Bakiye İadesi',
            description: 'Bekleyen talebinizi kendiniz iptal edebilirsiniz. Onaylanmış talepler için sistem yöneticisine başvurun. İptal durumunda bakiye otomatik iade edilir.'
        },
        {
            title: 'Avans İzin Kullanımı',
            description: 'Yıllık izin bakiyeniz yetersizse avans izin seçeneğini kullanabilirsiniz. Avans izin, henüz hak etmediğiniz günleri önceden kullanmanızı sağlar; bakiyeniz negatife düşebilir.'
        }
    ],
    tips: [
        { type: 'info', text: 'Bakiye düşümü "ilk hak edilen, ilk düşülür" yöntemiyle çalışır: en eski dönemdeki izin hakkınız önce kullanılır, böylece devreden izinler doğru takip edilir.' },
        { type: 'info', text: 'Mazeret izni yılda 18 saattir, günde en fazla 4,5 saat kullanılabilir ve her yıl 1 Ocakta sıfırlanır.' },
        { type: 'warning', text: 'Geçmiş tarihli talepler 2 mali ay geriye dönük pencere ile sınırlıdır. Kilitli mali dönemlerdeki tarihler için talep oluşturulamaz; kilitlenen dönemdeki bekleyen talepler otomatik iptal edilir.' },
        { type: 'success', text: 'Onaylanan izinler takvimde otomatik gösterilir ve bakiyenizden düşülür.' }
    ],
    faq: [
        { q: 'İzin bakiyem neden negatif?', a: 'Avans izin kullandığınızda bakiye negatife düşer; henüz hak etmediğiniz günleri önceden kullandığınızı gösterir.' },
        { q: 'Onaylanmış iznimi iptal edebilir miyim?', a: 'Kendiniz iptal edemezsiniz, sistem yöneticisine başvurmanız gerekir. İptal sonrası bakiyeniz otomatik iade edilir.' },
        { q: 'İzin talebim kime gidiyor?', a: 'Birincil yöneticinize otomatik yönlendirilir. Birincil yönetici bulunamazsa onay hiyerarşideki bir üst yöneticiye yükseltilir.' },
        { q: 'Mazeret izni bakiyemi nerede görebilirim?', a: 'Ana sayfadaki İzin Durumu kartında ve Talepler sayfasında saat bazında görüntülenir.' },
        { q: 'Kilitli dönemde izin talebi verebilir miyim?', a: 'Hayır. Kilitli mali dönemdeki tarihler için talep oluşturulamaz ve yöneticiler onay veremez. Kilit, Veri Yönetimi sayfasından yetkililerce yönetilir.' }
    ]
},
{
    id: 'kartsiz-giris',
    title: 'Kartsız Giriş Talebi',
    icon: Contact,
    description: 'Kart okutmayı unuttuğunuzda veya kartınız yanınızda olmadığında geriye dönük puantaj düzeltme talebi. (Tüm çalışanlar görebilir)',
    permission: null,
    link: '/requests',
    images: [
        { src: '/help-images/help-talepler-04.png', caption: 'Yeni Talep penceresi — Kartsız Giriş türünün seçimi' },
        { src: '/help-images/help-talepler-01.png', caption: 'Kendi Taleplerim — kartsız giriş taleplerinin durum takibi' }
    ],
    steps: [
        {
            title: 'Ne Zaman Kullanılır?',
            description: 'Kartınızı unuttuğunuzda, kart okutmayı atladığınızda veya o gün kart okuyucudan geçemediğinizde puantaj kaydınızı düzeltmek için kartsız giriş talebi oluşturabilirsiniz.'
        },
        {
            title: 'Talep Oluşturma',
            description: 'Talepler sayfasında "Yeni Talep" düğmesine tıklayın ve açılan pencereden "Kartsız Giriş" türünü seçin.',
            image: { src: '/help-images/help-talepler-04.png', caption: 'Talep türü seçim penceresi' }
        },
        {
            title: 'Tarih ve Saatleri Girme',
            description: 'İlgili tarihi seçin, gerçek giriş ve çıkış saatlerinizi girin ve durumu açıklayan bir not yazın. Form, seçtiğiniz günün vardiya bilgisini gösterir.'
        },
        {
            title: 'Onay Süreci',
            description: 'Talebiniz birincil yöneticinize gider. Yönetici talebi inceleyip onaylar veya reddeder; sonuç size bildirim olarak iletilir.'
        },
        {
            title: 'Onay Sonrası Otomatik Puantaj',
            description: 'Talep onaylandığında puantaj kaydınız belirttiğiniz saatlerle otomatik oluşturulur ve o günün çalışma süresi yeniden hesaplanır.'
        },
        {
            title: 'Talebi Takip Etme',
            description: 'Kendi Taleplerim listesinden talebinizin durumunu (bekliyor/onaylandı/reddedildi) izleyebilir, bekleyen talebinizi iptal edebilirsiniz.',
            image: { src: '/help-images/help-talepler-01.png', caption: 'Talep listesi ve durumlar' }
        }
    ],
    tips: [
        { type: 'info', text: 'Kartsız giriş talebi geriye dönük 2 mali ay içindeki tarihler için verilebilir; daha eski tarihler için talep oluşturulamaz.' },
        { type: 'warning', text: 'Aynı gün için bekleyen veya onaylanmış bir kartsız giriş talebiniz varken yeni talep veremezsiniz. Önce mevcut talebin sonuçlanması gerekir.' },
        { type: 'warning', text: 'Kilitli mali dönemdeki tarihler için kartsız giriş talebi oluşturulamaz.' },
        { type: 'success', text: 'Saatleri gerçeğe uygun girin; onay sonrası gün otomatik yeniden hesaplandığı için doğru saatler doğru puantaj demektir.' }
    ],
    faq: [
        { q: 'Talebim onaylandı ama puantajım ne zaman düzelir?', a: 'Onayla birlikte puantaj kaydı otomatik oluşturulur ve gün anında yeniden hesaplanır; ek bir işlem gerekmez.' },
        { q: 'Aynı gün için ikinci bir talep verebilir miyim?', a: 'Hayır. O gün için bekleyen veya onaylı bir kartsız giriş talebi varken yenisi oluşturulamaz. Hatalı talebinizi (bekliyorsa) iptal edip yenisini verebilirsiniz.' },
        { q: 'Ne kadar geriye dönük talep verebilirim?', a: 'Tüm talep türlerinde olduğu gibi geriye dönük pencere 2 mali aydır.' },
        { q: 'Yarım gün çalıştım, sadece çıkışı mı unuttum?', a: 'Gerçek giriş ve çıkış saatlerinizin tamamını belirterek talep oluşturun; onay sonrası gün bu saatlere göre hesaplanır.' },
        { q: 'Talebim reddedilirse ne olur?', a: 'Puantajınızda değişiklik yapılmaz ve size red bildirimi gelir. Gerekirse yöneticinizle görüşüp yeni bir talep oluşturabilirsiniz.' }
    ]
},
{
    id: 'ek-mesai',
    title: 'Fazla Mesai',
    icon: Timer,
    description: 'Fazla mesai takvimi, planlı/algılanan/manuel talep yolları, haftalık limit takibi; yöneticiler için mesai atama, gelen talepler ve analiz. (Tüm çalışanlar görebilir; Mesai Ata ve Gelen Talepler yalnızca ekibi olan yöneticilerde görünür)',
    permission: null,
    link: '/requests',
    images: [
        { src: '/help-images/help-talepler-03.png', caption: 'Fazla Mesai sekmesi — aylık takvim, renk lejantı (Onaylı/Bekleyen/Algılanan/Reddedilen/Atanmış), haftalık limit çubuğu ve Manuel Mesai Talebi düğmesi' },
        { src: '/help-images/help-talepler-06.png', caption: 'Mesai Ata görünümü — yöneticiler için takvimden toplu mesai atama' }
    ],
    steps: [
        {
            title: 'Fazla Mesai Sekmesine Erişim',
            description: 'Talepler sayfasında Fazla Mesai sekmesini açın. Ekibi olan yöneticiler dört alt görünüm görür: Taleplerim, Mesai Ata, Gelen Talepler ve Analiz. Ekibi olmayan çalışanlar doğrudan kişisel takvim görünümünü görür.'
        },
        {
            title: 'Takvim Görünümü ve Renk Lejantı',
            description: 'Aylık takvimde mesai kayıtlarınız renk kodlarıyla gösterilir: Onaylı, Bekleyen, Algılanan (potansiyel), Reddedilen ve Atanmış. Bir güne tıklayarak o günün mesai ayrıntısını açabilirsiniz.',
            image: { src: '/help-images/help-talepler-03.png', caption: 'Aylık mesai takvimi ve renk lejantı' }
        },
        {
            title: 'Üç Talep Yolu',
            description: 'Fazla mesai üç yolla oluşur: (1) Planlı — yöneticiniz size mesai atar, çalışmanız atamaya göre değerlendirilir. (2) Algılanan — vardiya dışı çalışmanız sistem tarafından otomatik potansiyel mesai olarak tespit edilir, takvimden talep edebilirsiniz. (3) Manuel — "Manuel Mesai Talebi" düğmesiyle tarih ve saat belirterek kendiniz talep oluşturursunuz.'
        },
        {
            title: 'Haftalık Limit Takibi',
            description: 'Takvimin üstündeki çubuk haftalık fazla mesai limitinizi gösterir. Limit varsayılan 30 saattir; Pazartesi-Pazar sabit takvim haftasında onaylı ve bekleyen mesai toplamı sayılır ve her Pazartesi sıfırlanır. Limit dolduğunda yeni talep oluşturulamaz.'
        },
        {
            title: 'Yönetici: Mesai Atama',
            description: 'Mesai Ata görünümünde ekibinizdeki çalışanlara takvimden tarih seçerek toplu fazla mesai ataması yapabilirsiniz. Atanan mesai, çalışanın takviminde "Atanmış" olarak görünür.',
            image: { src: '/help-images/help-talepler-06.png', caption: 'Mesai Ata görünümü' }
        },
        {
            title: 'Yönetici: Gelen Talepler ve Analiz',
            description: 'Gelen Talepler görünümünde ekibinizden gelen fazla mesai taleplerini inceleyip onaylar veya reddedersiniz. Analiz görünümünde ekibinizin fazla mesai istatistiklerini ve performans göstergelerini izleyebilirsiniz.'
        }
    ],
    tips: [
        { type: 'info', text: 'Minimum fazla mesai eşiği (30 dk) küme bazlıdır: aynı gündeki mesai parçaları aralarında 3 saatten büyük boşluk varsa ayrı kümelere ayrılır. Eşiğin altında kalan küme sıfırlanır ve talep edilemez; diğer kümeler etkilenmez.' },
        { type: 'warning', text: 'Haftalık limit hesabına hem onaylı hem bekleyen talepler dahildir. Bekleyen talepleriniz limiti doldurursa yeni talep veremezsiniz; gereksiz bekleyen talepleri iptal edin.' },
        { type: 'info', text: 'Vardiya sonrası çalışmada önce mesai eksiğiniz kapatılır (30 dk normal tolerans penceresi), kalan süre fazla mesai olur. Eksiğiniz yoksa vardiya sonrası sürenin tamamı mesaidir.' },
        { type: 'success', text: 'Geriye dönük mesai talebi 2 mali ay içindeki tarihler için verilebilir. Onaylanan geçmiş ay mesaileri aylık özetinize otomatik yansır.' }
    ],
    faq: [
        { q: 'Algılanan (potansiyel) mesai nedir?', a: 'Vardiya dışında çalıştığınızda sistemin otomatik tespit ettiği mesaidir. Takvimde "Algılanan" renkte görünür; talep etmeden onaya gitmez, talep ettiğinizde yöneticinize iletilir.' },
        { q: 'Kısa süreli mesaim neden görünmüyor?', a: 'Aynı gündeki mesai parçaları kümelere ayrılır ve 30 dakikanın altında kalan küme sıfırlanır. Örneğin vardiya öncesi 12 dakikalık tek başına bir çalışma mesai olarak sayılmaz.' },
        { q: 'Haftalık limitim doldu, ne yapabilirim?', a: 'Limit her Pazartesi sıfırlanır. Bekleyen gereksiz talepleriniz varsa iptal ederek alan açabilirsiniz; limit artışı için yöneticinize başvurun.' },
        { q: 'Atanan mesaiyi yapmazsam ne olur?', a: 'Atama tek başına mesai kazandırmaz; fiili çalışmanız esas alınır. Çalışmadığınız atamalar süre sonunda geçersiz hale gelir.' },
        { q: 'Mesai talebim kime gider?', a: 'Birincil yöneticinize gider; fazla mesaide ikincil (çapraz) yöneticiler de onay yetkisine sahip olabilir. Onay/red sonucu bildirim olarak iletilir.' }
    ]
},
{
    id: 'dis-gorev',
    title: 'Dış Görev Talebi',
    icon: Briefcase,
    description: 'Evden çalışma, saha görevi, toplantı/eğitim ve kurum ziyareti için şirket dışı görev talebi; çok günlü görev ve otomatik fazla mesai hesabı. (Tüm çalışanlar görebilir)',
    permission: null,
    link: '/requests',
    images: [
        { src: '/help-images/help-talepler-05.png', caption: 'Şirket Dışı Görev formu — görev tipi seçimi' },
        { src: '/help-images/help-talepler-04.png', caption: 'Yeni Talep penceresi — Şirket Dışı Görev türünün seçimi' }
    ],
    steps: [
        {
            title: 'Talep Oluşturma',
            description: 'Talepler sayfasında "Yeni Talep" düğmesine tıklayın ve açılan pencereden "Şirket Dışı Görev" türünü seçin.',
            image: { src: '/help-images/help-talepler-04.png', caption: 'Talep türü seçimi' }
        },
        {
            title: 'Görev Tipini Seçme',
            description: 'Dört görev tipi bulunur: Evden Çalışma (uzaktan çalışma kaydı), Saha Görevi (müşteri ziyareti, saha kontrolü vb.), Toplantı/Eğitim (dış toplantı veya eğitim katılımı) ve Kurum Ziyareti (resmi kurum, firma veya kuruluş ziyareti). Form adımları seçtiğiniz tipe göre otomatik ayarlanır.',
            image: { src: '/help-images/help-talepler-05.png', caption: 'Görev tipi seçim kartları' }
        },
        {
            title: 'Tarih Aralığı ve Gün Seçimi (Çok Günlü Görev)',
            description: 'Başlangıç ve bitiş tarihini seçin; aradaki her gün listeye eklenir. Her günü ayrı ayrı dahil edip hariç bırakabilirsiniz — örneğin hafta sonu veya tatil günlerini atlayabilirsiniz. "Tümünü dahil et", "Tümünü çıkar" ve "Sadece hafta içi" kısayolları toplu seçim sağlar. Tek günlük görevde gün otomatik dahil edilir.'
        },
        {
            title: 'Çalışma Saatlerini Girme',
            description: 'Dahil ettiğiniz her gün için başlangıç ve bitiş saatini girin. İlk dahil edilen güne varsayılan olarak 08:00-18:00 önerilir; "tümüne uygula" seçeneğiyle aynı saatleri tüm dahil günlere kopyalayabilirsiniz. Dahil edilen her günün saatleri dolu olmalıdır, aksi halde talep gönderilemez.'
        },
        {
            title: 'Mesai Hesabını Anlama',
            description: 'Dış görevde öğle molası düşülmez, girilen tüm süre çalışma sayılır. Vardiya saatleri içindeki süre normal mesai, vardiya dışındaki süre fazla mesai olarak değerlendirilir. Tatil ve hafta sonu günlerinde girilen sürenin tamamı fazla mesai sayılır.'
        },
        {
            title: 'Onay ve Otomatik Sonuçlar',
            description: 'Talebiniz yöneticinize gider. Onaylandığında dahil edilen her gün için ayrı puantaj kaydı oluşturulur. Onaylı görevin vardiya dışı kısmı otomatik olarak onaylı fazla mesaiye dönüşür — ayrıca mesai talebi vermenize gerek yoktur (görev + mesai birlikte onaylı kuralı).'
        }
    ],
    tips: [
        { type: 'success', text: 'Onaylanan dış görevin vardiya dışında kalan kısmı için ayrıca fazla mesai talebi oluşturmanız gerekmez; sistem bu süreyi otomatik onaylı mesai olarak işler.' },
        { type: 'info', text: 'Yarım gün tatillerde kesim saatinden sonraki görev çalışması fazla mesai sayılır; tam tatil ve hafta sonu günlerinde ise girilen sürenin tamamı fazla mesaidir.' },
        { type: 'warning', text: 'Çok günlü görevde yalnızca dahil işaretlediğiniz ve saatlerini doldurduğunuz günler gönderilir. Hafta sonunu çalışmayacaksanız o günleri hariç bırakın; aksi halde o günler görev günü olarak işlenir.' },
        { type: 'info', text: 'Geriye dönük dış görev talebi 2 mali ay penceresi ile sınırlıdır; kilitli mali dönemlerdeki tarihler için talep oluşturulamaz.' }
    ],
    faq: [
        { q: 'Hafta sonu göreve gittim, mesaim nasıl hesaplanır?', a: 'Tatil ve hafta sonu günlerinde dış görevde girilen sürenin tamamı fazla mesai sayılır ve görev onaylandığında otomatik onaylı mesai olarak işlenir.' },
        { q: 'Çok günlü görevde araya giren hafta sonunu nasıl atlarım?', a: 'Gün listesinde ilgili günlerin dahil işaretini kaldırın veya "Sadece hafta içi" kısayolunu kullanın. Hariç bırakılan günler için kayıt oluşturulmaz.' },
        { q: 'Evden çalışmada da fazla mesai oluşur mu?', a: 'Evet, hesap kuralı tüm görev tipleri için aynıdır: vardiya içi süre normal mesai, vardiya dışı süre fazla mesai olarak değerlendirilir.' },
        { q: 'Dış görevde öğle molası düşülür mü?', a: 'Hayır. Dış görevde öğle molası düşülmez, girdiğiniz sürenin tamamı çalışma olarak sayılır.' },
        { q: 'Görev onaylanınca puantajım nasıl görünür?', a: 'Dahil edilen her gün için ayrı bir dış görev puantaj kaydı oluşturulur ve o günlerin çalışma süresi girdiğiniz saatlere göre hesaplanır.' },
        { q: 'Görev talebim kime gider?', a: 'Birincil yöneticinize yönlendirilir. Onay/red sonucu size uygulama içi bildirim olarak iletilir.' }
    ]
},
{
        id: 'yemek-siparisi',
        title: 'Yemek Siparişi',
        icon: Utensils,
        description: 'Günlük yemek taleplerinin listelenmesi, personel adına talep oluşturma, sipariş/teslim işaretleme, not ve iptal yönetimi. (Yemek sipariş yetkisi olan kullanıcılar görebilir)',
        permission: 'PAGE_MEAL_ORDERS',
        link: '/meal-orders',
        images: [
            { src: '/help-images/help-yemek-01.png', caption: 'Yemek Sipariş Yönetimi — günlük talep listesi, özet kartları ve tarih gezgini' }
        ],
        steps: [
            {
                title: 'Tarih Seçimi ve Günlük Liste',
                description: 'Sayfanın üstündeki tarih gezgini ile istediğiniz günü seçin; ok düğmeleriyle önceki/sonraki güne geçebilirsiniz. Seçilen günün tüm yemek talepleri tabloda listelenir: Personel, Tercih/Açıklama, Not, Durum ve İşlem sütunları.',
                image: { src: '/help-images/help-yemek-01.png', caption: 'Günlük yemek talep listesi' }
            },
            {
                title: 'Özet Kartları',
                description: 'Listenin üzerinde 4 özet kartı bulunur: Toplam Talep, Sipariş Verilen (yeşil), Bekleyen (amber) ve İptal Edilen (kırmızı). Kartlar seçili günün anlık durumunu gösterir.'
            },
            {
                title: 'Personel Adına Talep Oluşturma',
                description: '"Personel Adına Talep Oluştur" düğmesine tıklayın. En az 2 harf yazarak personel arayın (yalnızca aktif personel listelenir), kişiyi seçin ve yemek tercihini açıklama alanına yazıp talebi oluşturun. Talep, seçili tarih için kaydedilir.'
            },
            {
                title: 'Sipariş Durumunu Yönetme',
                description: 'Bekleyen talebi "Sipariş Verildi" olarak işaretleyebilirsiniz; yanlışlıkla işaretlediyseniz aynı işlemle geri alabilirsiniz. Yemek geldiğinde "Teslim Edildi" işareti koyun. Ayrıca her kayda kalem simgesiyle sipariş notu ekleyip düzenleyebilirsiniz.'
            },
            {
                title: 'Talep İptali',
                description: 'İşlem sütunundaki iptal düğmesine tıklayın, açılan pencerede iptal gerekçesini yazıp onaylayın. İptal edilen kayıt listede soluk renkte gösterilir ve üzerinde başka durum işlemi yapılamaz.'
            },
            {
                title: 'Yemek Fişi İndirme',
                description: 'Her kayıt için JPEG formatında yemek fişi indirebilirsiniz. Fişte tarih, tercih, not, durum, fiş numarası ve oluşturulma saati yer alır. "Fişe bilgileri ekle" kutusunu işaretlerseniz personel adı ve departmanı da fişe eklenir.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Çalışanlar yemek taleplerini kesim saatine kadar oluşturabilir ve iptal edebilir. Günlük sipariş listesini kesim saatinden sonra kesinleştirmeniz önerilir.' },
            { type: 'info', text: 'Arama kutusu listeyi personel adına veya departman adına göre anında süzer. Kalabalık günlerde belirli bir departmanın taleplerini hızla bulabilirsiniz.' },
            { type: 'info', text: '"Teslim Edildi" ve "İptal Edildi" durumları kesindir; bu kayıtlar üzerinde durum değişikliği yapılamaz. "Sipariş Verildi" işareti ise geri alınabilir.' },
            { type: 'success', text: 'Not alanını tedarikçiye iletilecek özel talimatlar (alerji, porsiyon, adres vb.) için kullanabilirsiniz; not fişe de yansır.' }
        ],
        faq: [
            { q: 'Kesim saatinden sonra talep verilebilir mi?', a: 'Çalışanlar kendi taleplerini kesim saatine kadar verir ve iptal eder. Kesim saati sonrası düzeltme gerekiyorsa yemek sipariş yetkilisi bu sayfadan personel adına talep oluşturabilir veya gerekçe girerek iptal edebilir.' },
            { q: '"Sipariş Verildi" işaretini yanlışlıkla koydum, geri alabilir miyim?', a: 'Evet. Aynı işlem düğmesiyle işareti kaldırabilirsiniz. Ancak "Teslim Edildi" işaretlendikten sonra kayıt kesinleşir ve geri alınamaz.' },
            { q: 'Geçmiş günlerin taleplerini görebilir miyim?', a: 'Evet. Tarih gezgini ile herhangi bir güne gidebilir, o günün talep listesini ve özet kartlarını görüntüleyebilirsiniz.' },
            { q: 'Fişte kişisel bilgilerin görünmesini istemiyorum, ne yapmalıyım?', a: '"Fişe bilgileri ekle" kutusunun işaretini kaldırın. Bu durumda fişte yalnızca tarih, tercih, not, durum ve fiş numarası yer alır.' },
            { q: '"Bu tarih için yemek talebi bulunamadı" mesajı ne anlama gelir?', a: 'Seçili gün için hiçbir çalışan yemek talebi oluşturmamış demektir. Gerekirse "Personel Adına Talep Oluştur" ile talep ekleyebilirsiniz.' }
        ]
    },
    {
        id: 'takvim',
        title: 'Takvim',
        icon: Calendar,
        description: 'Tatiller, izinler, mesai görevleri, sağlık raporları, dış görevler ve kişisel etkinliklerin aylık/haftalık görünümü; yöneticiler için ekip görünümü. (Tüm çalışanlar görebilir)',
        permission: null,
        link: '/calendar',
        images: [
            { src: '/help-images/help-takvim-01.png', caption: 'Aylık takvim görünümü — renk kodlu etkinlik noktaları ve tatil işaretleri' },
            { src: '/help-images/help-takvim-02.png', caption: 'Gün detay paneli — seçilen günün etkinlikleri tür başlıklarıyla gruplu' }
        ],
        steps: [
            {
                title: 'Aylık ve Haftalık Görünüm',
                description: 'Sayfanın üstündeki görünüm düğmeleriyle aylık ve haftalık görünüm arasında geçiş yapın. Ok düğmeleri bir ay/hafta ileri-geri götürür, "Bugün" düğmesi sizi güncel tarihe döndürür.',
                image: { src: '/help-images/help-takvim-01.png', caption: 'Aylık görünüm ve gezinme düğmeleri' }
            },
            {
                title: 'Renk Kodlarını Okuma',
                description: 'Her etkinlik türü ayrı renkle gösterilir: kırmızı resmi tatil, yeşil onaylı izin, mor mesai görevi, amber bekleyen talep, pembe sağlık raporu, turuncu dış görev, mavi kişisel etkinlik. Yarım gün tatiller çapraz çizgili desenle ayırt edilir.'
            },
            {
                title: 'Etkinlik Filtreleri',
                description: 'İzinler ve sağlık raporları varsayılan olarak açıktır. Mesai görevleri, mesai talepleri ve kartsız giriş katmanları isteğe bağlıdır — görmek için ilgili filtre düğmesini açın. Arama kutusuyla etkinlikleri başlık, açıklama veya konuma göre süzebilirsiniz.'
            },
            {
                title: 'Gün Detay Paneli',
                description: 'Takvimde bir güne tıkladığınızda sağdaki panelde o günün tüm kayıtları tür başlıklarıyla gruplu olarak açılır: saat aralığı (veya "Tüm Gün"), konum ve varsa ilgili çalışan bilgisi gösterilir.',
                image: { src: '/help-images/help-takvim-02.png', caption: 'Gün detay paneli' }
            },
            {
                title: 'Kişisel Etkinlik Oluşturma ve Taşıma',
                description: 'Gün detay panelindeki "Yeni Etkinlik" düğmesiyle kişisel etkinlik ekleyin. Yalnızca kendi kişisel etkinliklerinizi düzenleyebilir, silebilir ve sürükle-bırak ile başka bir güne taşıyabilirsiniz. Tekrarlı etkinlikler tekrar simgesiyle işaretlenir.'
            },
            {
                title: 'Ekip Görünümü (Yöneticiler)',
                description: 'Ekibi olan yöneticiler "Ekip" düğmesiyle ekip görünümünü açar: ekip üyelerinin izin, mesai, sağlık raporu ve kartsız giriş kayıtları tablo halinde listelenir. Gün detay panelinde de o gün kaydı olan ekip üyeleri "Ekip Durumu" başlığı altında rozetlerle gösterilir.'
            }
        ],
        tips: [
            { type: 'info', text: 'Yarım gün tatiller çapraz çizgili gösterilir. Yarım gün tatilde kesim saatinden sonra yapılan dış görev çalışması fazla mesai sayılır.' },
            { type: 'warning', text: 'Mesai görevi ve mesai talebi katmanları varsayılan olarak kapalıdır. Atanmış mesainizi takvimde göremiyorsanız önce ilgili filtreyi açın.' },
            { type: 'info', text: 'Takvim her 60 saniyede bir otomatik yenilenir; yeni onaylanan kayıtlar kısa süre içinde görünür.' },
            { type: 'success', text: 'Onaylanan izinler, sağlık raporları ve dış görevler takvime otomatik yansır; elle ekleme yapmanız gerekmez.' }
        ],
        faq: [
            { q: 'Atanan mesai görevim takvimde görünmüyor, neden?', a: 'Mesai görevi katmanı varsayılan olarak kapalıdır. Takvim üzerindeki filtre düğmelerinden mesai görevlerini açtığınızda mor renkle görünecektir.' },
            { q: 'Başkalarının etkinliklerini görebilir miyim?', a: 'Yalnızca size görünür olan kayıtlar listelenir. Kişisel etkinlikler, sahibi sizinle veya departmanınızla paylaşmadıkça başkalarına görünmez. Yöneticiler ek olarak ekip üyelerinin izin/mesai/rapor kayıtlarını ekip görünümünde görebilir.' },
            { q: 'Etkinliğimi başka bir güne nasıl taşırım?', a: 'Kendi kişisel etkinliğinizi takvimde sürükleyip hedef güne bırakın veya gün detayından kalem simgesiyle düzenleyip tarihini değiştirin. İzin, mesai gibi sistem kayıtları taşınamaz.' },
            { q: 'Resmi tatil günü çalışırsam ne olur?', a: 'Tatil günündeki çalışma sistem tarafından fazla mesai olarak algılanır ve potansiyel mesai kaydı oluşur. Takvimde tatil kırmızı ile işaretli kalır.' },
            { q: 'Yarım gün tatil neden farklı görünüyor?', a: 'Yarım gün tatiller (arife gibi) çapraz çizgili desenle gösterilir. O gün kesim saatine kadar normal mesai geçerlidir; sonrası tatildir.' }
        ]
    },
    {
        id: 'sirket-rehberi',
        title: 'Şirket Rehberi',
        icon: Contact,
        description: 'Aktif çalışanların kurumsal iletişim rehberi — ad ve departmana göre arama. (Tüm çalışanlar görebilir)',
        permission: null,
        link: '/company-directory',
        images: [
            { src: '/help-images/help-rehber-01.png', caption: 'Şirket Rehberi — çalışan kartları ve arama kutusu' }
        ],
        steps: [
            {
                title: 'Rehbere Erişim',
                description: 'Sol menüden "Şirket Rehberi" seçeneğine tıklayın. Şirketteki tüm aktif çalışanlar kartlar halinde listelenir.',
                image: { src: '/help-images/help-rehber-01.png', caption: 'Rehber genel görünümü' }
            },
            {
                title: 'Çalışan Arama',
                description: 'Arama kutusuna ad veya departman adı yazarak listeyi anında süzebilirsiniz. Örneğin bir departman adı yazdığınızda o departmandaki tüm çalışanlar listelenir.'
            },
            {
                title: 'Çalışan Kartını İnceleme',
                description: 'Her kartta çalışanın adı, departmanı ve pozisyonu gibi temel kurumsal bilgiler yer alır. Rehber, kiminle hangi konuda iletişim kuracağınızı hızla bulmanızı sağlar.'
            },
            {
                title: 'Gizlilik Kapsamı',
                description: 'Rehberde yalnızca aktif çalışanlar listelenir; işten ayrılan personel görünmez. TC kimlik numarası gibi hassas kişisel veriler rehberde hiçbir şekilde gösterilmez.'
            }
        ],
        tips: [
            { type: 'info', text: 'Rehberde yalnızca aktif çalışanlar yer alır. İşten ayrılan personel listeden otomatik olarak çıkar.' },
            { type: 'info', text: 'KVKK gereği TC kimlik numarası gibi hassas veriler rehberde gösterilmez; yalnızca kurumsal iletişim için gerekli bilgiler yer alır.' },
            { type: 'success', text: 'Yeni başladıysanız departmanınızın adını aratarak ekip arkadaşlarınızı hızla tanıyabilirsiniz.' }
        ],
        faq: [
            { q: 'İşten ayrılan bir çalışanı neden rehberde bulamıyorum?', a: 'Rehber yalnızca aktif çalışanları listeler. Pasif duruma alınan personel otomatik olarak listeden çıkarılır.' },
            { q: 'Rehberde TC kimlik numarası veya adres görünür mü?', a: 'Hayır. Hassas kişisel veriler rehberde gösterilmez. Yalnızca kurumsal iletişim için gerekli temel bilgiler yer alır.' },
            { q: 'Rehberdeki bilgilerim yanlış, nasıl düzeltebilirim?', a: 'Ad, departman ve pozisyon bilgileri Çalışan Yönetimi sayfasından yönetici tarafından güncellenir. İK birimine veya yöneticinize başvurun.' },
            { q: 'Arama nasıl çalışır?', a: 'Arama kutusuna yazdığınız metin, çalışan adı ve departman adı üzerinde anında süzme yapar. Sayfayı yenilemenize gerek yoktur.' }
        ]
    },
    {
        id: 'dilek-sikayetler',
        title: 'Dilek ve Şikayetler',
        icon: MessageSquare,
        description: 'Dilek, öneri ve şikayetlerinizi yönetime iletme; gelen cevapları takip etme. Yetkili yöneticiler için yönetim sekmesi. (Tüm çalışanlar görebilir)',
        permission: null,
        link: '/feedback',
        images: [
            { src: '/help-images/help-geribildirim-01.png', caption: 'Geri bildirim listesi — Toplam, Beklemede, Cevaplanan ve Okunmamış Cevap kartları ile sekmeler' },
            { src: '/help-images/help-geribildirim-02.png', caption: 'Yeni geri bildirim oluşturma penceresi' }
        ],
        steps: [
            {
                title: 'Sayfaya Erişim ve Özet Kartları',
                description: 'Sol menüden "Dilek ve Şikayetler" sayfasına gidin. Üstteki 4 kart durumunuzu özetler: Toplam, Beklemede, Cevaplanan ve Okunmamış Cevap sayıları.',
                image: { src: '/help-images/help-geribildirim-01.png', caption: 'Özet kartları ve geri bildirim listesi' }
            },
            {
                title: 'Yeni Geri Bildirim Oluşturma',
                description: 'Yeni bildirim düğmesine tıklayın, açılan pencerede konunuzu ve mesajınızı yazıp gönderin. Dilek, öneri veya şikayet niteliğindeki her konuyu iletebilirsiniz.',
                image: { src: '/help-images/help-geribildirim-02.png', caption: 'Yeni bildirim penceresi' }
            },
            {
                title: 'Geri Bildirimlerim Sekmesi',
                description: '"Geri Bildirimlerim" sekmesinde gönderdiğiniz tüm bildirimler ve durumları listelenir. Cevaplanan bir bildirimin üzerine tıklayarak yönetimin cevabını okuyabilirsiniz; okunmamış cevaplar ayrıca sayaçta gösterilir.'
            },
            {
                title: 'Yönetim Sekmesi (Yetkili Yöneticiler)',
                description: 'Yetkili yöneticiler "Yönetim" sekmesini görür. Bu sekmede çalışanlardan gelen geri bildirimler incelenir ve cevaplanır. Cevaplanan bildirim, gönderen çalışanın listesinde "Cevaplanan" durumuna geçer.'
            }
        ],
        tips: [
            { type: 'info', text: 'Geri bildiriminizi açık ve somut yazın; konuyu, yaşadığınız durumu ve varsa önerinizi belirtmek cevaplama sürecini hızlandırır.' },
            { type: 'success', text: 'Cevap geldiğinde "Okunmamış Cevap" kartındaki sayaç artar. İlgili bildirimi açtığınızda cevap okundu sayılır.' },
            { type: 'info', text: '"Yönetim" sekmesi yalnızca yetkili yöneticilere görünür. Bu sekmeyi görmüyorsanız hesabınızda ilgili yetki tanımlı değildir.' }
        ],
        faq: [
            { q: 'Geri bildirimimi kimler görebilir?', a: 'Gönderdiğiniz bildirimler, Yönetim sekmesine erişim yetkisi olan yöneticiler tarafından görüntülenir ve cevaplanır.' },
            { q: 'Cevap geldiğini nasıl anlarım?', a: 'Sayfanın üstündeki "Okunmamış Cevap" kartında sayaç artar. Geri Bildirimlerim sekmesinde ilgili kaydı açarak cevabı okuyabilirsiniz.' },
            { q: 'Bildirimimin durumları ne anlama geliyor?', a: '"Beklemede" henüz cevaplanmadığını, "Cevaplanan" yönetimin cevap yazdığını gösterir. Üst kartlar bu sayıları özetler.' },
            { q: 'Yönetim sekmesini neden göremiyorum?', a: 'Yönetim sekmesi yalnızca geri bildirim yönetim yetkisi olan yöneticilere görünür. Yetki için sistem yöneticinize başvurun.' }
        ]
    },
    {
        id: 'vekalet-yonetimi',
        title: 'Vekalet Yönetimi',
        icon: UserCheck,
        description: 'İzin veya görev nedeniyle yokken onay yetkilerinizi belirli bir tarih aralığında vekile devretme. (Yöneticiler ve vekaleti olan kullanıcılar görebilir)',
        permission: null,
        link: '/substitute-management',
        images: [
            { src: '/help-images/help-vekalet-01.png', caption: 'Vekalet Yönetimi — vekalet tanımlama ve mevcut vekaletlerin listesi' }
        ],
        steps: [
            {
                title: 'Vekalet Tanımlama',
                description: 'Vekalet Yönetimi sayfasında vekil olarak atayacağınız kişiyi seçin ve vekaletin başlangıç-bitiş tarihlerini belirleyin. Kaydettiğinizde vekalet, belirtilen tarih aralığı için tanımlanır.',
                image: { src: '/help-images/help-vekalet-01.png', caption: 'Vekalet tanımlama ekranı' }
            },
            {
                title: 'Vekalet Süresince Onay Akışı',
                description: 'Vekalet süresi boyunca size gelen bekleyen onay talepleri (izin, fazla mesai vb.) otomatik olarak vekilinize yönlendirilir. Vekiliniz bu talepleri sizin adınıza onaylayıp reddedebilir.'
            },
            {
                title: 'Otomatik Sonlanma',
                description: 'Vekalet, bitiş tarihinde otomatik olarak sonlanır. Ek bir işlem yapmanıza gerek yoktur; bitişten sonra gelen talepler tekrar doğrudan size düşer.'
            },
            {
                title: 'Bildirimler',
                description: 'Vekalet tanımlandığında ve sonlandığında hem siz hem vekiliniz uygulama içi bildirim alırsınız. Böylece iki taraf da yetki devrinin ne zaman başlayıp bittiğini bilir.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Vekalet, onay yetkilerinizin devri anlamına gelir. Vekil olarak ekibinizin taleplerini değerlendirebilecek, konuya hakim bir yönetici seçin.' },
            { type: 'info', text: 'Vekalet Yönetimi menüsü yöneticiler ve üzerinde aktif vekalet bulunan kullanıcılar tarafından görülür.' },
            { type: 'success', text: 'İzne çıkmadan önce vekalet tanımlarsanız, yokluğunuzda ekibinizin talepleri bekleyen durumda birikmez ve süreçler aksamaz.' }
        ],
        faq: [
            { q: 'Vekilim hangi işlemleri yapabilir?', a: 'Vekalet süresince size yönlendirilen bekleyen onay talepleri vekilinize düşer; vekiliniz bu talepleri sizin adınıza değerlendirir.' },
            { q: 'Vekalet bittiğinde ne olur?', a: 'Vekalet bitiş tarihinde otomatik sonlanır. Yeni gelen talepler tekrar doğrudan size yönlendirilir ve iki taraf da bildirim alır.' },
            { q: 'Vekil atandığımı nasıl anlarım?', a: 'Vekalet tanımlandığında uygulama içi bildirim alırsınız. Ayrıca vekaleti olan kullanıcıların menüsünde Vekalet Yönetimi sayfası görünür.' },
            { q: 'Menüde Vekalet Yönetimi seçeneğini göremiyorum, neden?', a: 'Bu sayfa yöneticiler ve üzerinde vekalet tanımlı kullanıcılar tarafından görülür. Ekibi olmayan ve vekaleti bulunmayan çalışanların menüsünde yer almaz.' }
        ]
    },
    {
        id: 'organizasyon-semasi',
        title: 'Organizasyon Şeması',
        icon: Network,
        description: 'Şirketin yönetim hiyerarşisini görsel şema üzerinde inceleme — dalları genişletme, yakınlaştırma ve çalışan kartı detayları. (Organizasyon şeması yetkisi olan kullanıcılar görebilir)',
        permission: 'PAGE_ORG_CHART',
        link: '/organization-chart',
        images: [
            { src: '/help-images/help-orgchart-01.png', caption: 'Organizasyon şeması — hiyerarşik yapı ve çalışan kartları' }
        ],
        steps: [
            {
                title: 'Şemaya Erişim',
                description: 'Sol menüden "Organizasyon Şeması" sayfasına gidin. Şirketin yönetim hiyerarşisi, en üst kademeden başlayarak ağaç yapısında görüntülenir.',
                image: { src: '/help-images/help-orgchart-01.png', caption: 'Şema genel görünümü' }
            },
            {
                title: 'Hiyerarşide Gezinme',
                description: 'Bir yöneticinin altındaki dalları genişleterek ekibini görebilir, daraltarak şemayı sadeleştirebilirsiniz. Böylece büyük yapılarda yalnızca ilgilendiğiniz bölüme odaklanırsınız.'
            },
            {
                title: 'Yakınlaştırma ve Kaydırma',
                description: 'Şemayı yakınlaştırıp uzaklaştırabilir, fare ile sürükleyerek görünür alanı kaydırabilirsiniz. Geniş organizasyonlarda tüm yapıyı tek bakışta görmek için uzaklaştırın, detay için yakınlaştırın.'
            },
            {
                title: 'Çalışan Kartı Detayı',
                description: 'Şemadaki bir çalışan kartına tıklayarak kişinin ad, pozisyon ve departman gibi detay bilgilerini görüntüleyebilirsiniz. Kartlar kimin kime bağlı çalıştığını net olarak gösterir.'
            }
        ],
        tips: [
            { type: 'info', text: 'Şema, sistemdeki yönetici-çalışan ilişkilerinden otomatik oluşur. Yapıdaki bir değişiklik (yönetici ataması vb.) şemaya otomatik yansır.' },
            { type: 'info', text: 'Bu sayfa PAGE_ORG_CHART yetkisi gerektirir. Menüde görmüyorsanız hesabınızda bu yetki tanımlı değildir.' },
            { type: 'success', text: 'Bir talebin hangi yöneticiye gideceğini merak ediyorsanız şemadan bağlı olduğunuz yöneticiyi kontrol edebilirsiniz.' }
        ],
        faq: [
            { q: 'Şemada kendimi neden göremiyorum?', a: 'Şema yönetici-çalışan ilişkilerinden oluşur. Kaydınızda birincil yönetici tanımlı değilse şemada konumlanmayabilirsiniz; İK birimine veya sistem yöneticinize başvurun.' },
            { q: 'Şemadaki bilgiler yanlış, nasıl düzeltilir?', a: 'Yönetici atamaları Çalışan Yönetimi sayfasından güncellenir. Değişiklik yapıldığında şema otomatik olarak yenilenir.' },
            { q: 'Sayfayı menüde göremiyorum, neden?', a: 'Organizasyon Şeması sayfası PAGE_ORG_CHART yetkisi olan kullanıcılara açıktır. Erişim için sistem yöneticinize başvurun.' },
            { q: 'Şema çok büyük, belirli bir bölümü nasıl bulurum?', a: 'Önce uzaklaştırıp genel yapıyı görün, ilgili dalı genişletin ve o bölüme yakınlaştırın. İlgisiz dalları daraltarak görünümü sadeleştirebilirsiniz.' }
        ]
    },
    {
        id: 'mesai-takibi',
        title: 'Mesai Takibi',
        icon: Clock,
        description: 'Günlük ve aylık mesai analizi: giriş/çıkış hareketleri, mola, fazla mesai, aylık hedef-bakiye ve haftalık mesai limitleri. Yöneticiler ek olarak ekip puantaj tablosunu görür. (Tüm çalışanlar görebilir)',
        permission: null,
        link: '/attendance',
        images: [
            { src: '/help-images/help-mesai-01.png', caption: 'Üst özet — günlük durum, aylık performans ve haftalık mesai limit şeridi' },
            { src: '/help-images/help-mesai-02.png', caption: 'Ekip sekmesi — ekip puantaj tablosu ve durum filtreleri' }
        ],
        steps: [
            {
                title: 'Günlük / Aylık Görünüm Seçimi',
                description: 'Sayfanın üstündeki anahtarla "Günlük" ve "Aylık" görünüm arasında geçiş yapın. Günlük görünümde tarih seçici ve "Bugün" kısayolu bulunur; aylık görünümde ay-yıl seçilir ve mali dönem aralığı (varsayılan: önceki ayın 26\'sı - ayın 25\'i) gösterilir.',
                image: { src: '/help-images/help-mesai-01.png', caption: 'Görünüm anahtarı ve dönem seçimi' }
            },
            {
                title: 'Günlük Durum Özeti',
                description: 'Günlük görünümde seçilen günün özeti gösterilir: gün türü (Normal Mesai, Tatil Günü, İzinli Gün, Fazla Mesai Günü veya Şirket Dışı Çalışma), günlük hedef süre, kalan mola ve fazla mesai bilgileri.'
            },
            {
                title: 'Aylık Performans ve Bakiye',
                description: 'Aylık bölümde seçili mali dönemin hedef çalışma süresi, gerçekleşen süre ve bakiyesi (fark) özetlenir. Aylar arasında geçiş yaparak geçmiş dönemleri inceleyebilirsiniz.'
            },
            {
                title: 'Haftalık Fazla Mesai Limit Şeridi',
                description: 'Aylık özetin altında dönemin haftaları (Pazartesi-Pazar) küçük kutular halinde sıralanır; her kutuda kullanılan/limit saat gösterilir. Aktif hafta "Bu Hafta" etiketiyle vurgulanır, doluluk oranına göre renk değişir. Bir haftaya tıklayınca haftanın mesai detay çekmecesi açılır.'
            },
            {
                title: 'Çalışma Grafiği',
                description: 'Grafik, dönem boyunca günlük çalışma sürelerinizi gösterir. Grafikte bir güne tıkladığınızda sayfa o günün günlük görünümüne geçer ve tablo o günün kayıtlarına süzülür.'
            },
            {
                title: 'Detaylı Günlük Hareketler Tablosu',
                description: 'Tabloda her kayıt için Tarih, Tür, Giriş, Çıkış, Süre, Beklenen, Mola, Durum ve Detay sütunları yer alır. Tür sütunu kaydın kaynağını (kart okuma, fazla mesai, admin girişi vb.) rozetle gösterir; çıkışı yapılmamış açık kayıtlar "Çıkış Bekliyor" durumundadır.'
            },
            {
                title: 'Ekip Sekmesi (Yöneticiler)',
                description: 'Ekibi olan yöneticiler "Ekip" sekmesinde ekip puantaj tablosunu görür: ad/departman araması (Türkçe karakter uyumlu), durum filtreleri (çevrimiçi, geç kalan, fazla mesai, eksik gün vb.) ve hiyerarşik gruplama. Bir çalışana tıklayınca o kişinin detay görünümü açılır; "Ekip Tablosuna Dön" ile geri dönülür.',
                image: { src: '/help-images/help-mesai-02.png', caption: 'Ekip puantaj tablosu' }
            }
        ],
        tips: [
            { type: 'info', text: 'Haftalık fazla mesai limiti varsayılan 30 saattir; Pazartesi-Pazar sabit takvim haftasında onaylı ve bekleyen mesai toplamı sayılır, her Pazartesi sıfırlanır.' },
            { type: 'warning', text: 'Kilitli mali dönemlerdeki kayıtlar değiştirilemez; bu dönemler için talep oluşturulamaz ve onay verilemez. Geriye dönük düzeltmeler 2 mali ay penceresiyle sınırlıdır.' },
            { type: 'info', text: 'Mali dönem varsayılan olarak önceki ayın 26\'sından ayın 25\'ine kadardır; şirket takvimine göre farklı sınırlar tanımlanmış olabilir. Aylık görünümde seçili dönemin tarih aralığı gösterilir.' },
            { type: 'success', text: 'Grafikte herhangi bir güne tıklayarak o günün detayına saniyeler içinde inebilirsiniz; ay sınırı değişse bile dönem otomatik ayarlanır.' }
        ],
        faq: [
            { q: 'Ekip sekmesini neden göremiyorum?', a: 'Ekip sekmesi yalnızca ekibi olan yöneticilere görünür. Size bağlı çalışan tanımlı değilse sadece "Kendi Mesaim" sekmesi listelenir.' },
            { q: 'Dönem neden ayın 26\'sında başlıyor?', a: 'Sistem mali dönem mantığıyla çalışır: varsayılan dönem önceki ayın 26\'sından ilgili ayın 25\'ine kadardır. Bordro hesaplamaları bu döneme göre yapılır.' },
            { q: 'Durum sütununda "Çıkış Bekliyor" ne anlama gelir?', a: 'Giriş kaydı var ancak henüz çıkış kartı okutulmamış demektir. Çıkış yapmazsanız kayıt gece yarısı otomatik görevle kapatılır ve yanlış potansiyel mesai oluşabilir.' },
            { q: 'Haftalık mesai limitim dolarsa ne olur?', a: 'O hafta için yeni fazla mesai talebi oluşturulamaz. Limit her Pazartesi sıfırlanır; hesaba onaylı ve bekleyen talepler birlikte dahildir.' },
            { q: 'Mola sürem nasıl hesaplanıyor?', a: 'Gün içindeki her çıkış-giriş aralığı mola olarak sayılır. Tablodaki Mola sütununda günlük toplam mola süreniz gösterilir; hakkınızı aşan kısım çalışma sürenizden düşülür.' },
            { q: 'Ekibimden bir çalışanın detayına nasıl bakarım?', a: 'Ekip sekmesindeki tabloda ilgili çalışanın satırına tıklayın. Kişinin günlük/aylık detay görünümü açılır; "Ekip Tablosuna Dön" bağlantısıyla tabloya geri dönersiniz.' }
        ]
    },
{
        id: 'ekip-analizi',
        title: 'Ekip Analizi',
        icon: PieChart,
        description: 'Ekibinizin mesai doluluğu, fazla mesai, eksik saat, talep ve anomali analizleri; otomatik öngörüler ve kişi/ekip karşılaştırması. (PRIMARY ekibi olan yöneticiler ve sistem yöneticileri görebilir)',
        permission: null,
        managerOnly: true,
        link: '/analytics',
        images: [
            { src: '/help-images/help-analiz-01.png', caption: 'Öngörüler sekmesi — kritik/uyarı sayaçları ve öngörü dağılım pastası' },
            { src: '/help-images/help-analiz-02.png', caption: 'Mesai Analizi sekmesi — doluluk, fazla mesai ve eksik saat dağılımı' }
        ],
        steps: [
            {
                title: 'Sayfaya Erişim ve Görünüm Seçimi',
                description: 'Sol menüden "Ekip Analizi" sayfasına gidin. Üst filtre çubuğundan Aylık (tek mali ay, haftalık kırılım) veya Yıllık (12 ay özeti, mali yıl seçici) görünüm arasında geçiş yapabilirsiniz. Hızlı aralık seçenekleri de mevcuttur: Bu Hafta, Bu Ay, Son 90 Gün, Bu Yıl.'
            },
            {
                title: 'Öngörüler Sekmesi',
                description: 'Sayfa açılışında varsayılan sekme Öngörüler\'dir. Sistem verilerinizden otomatik bulgular üretir ve kritik/uyarı sayaçları ile öngörü pastası gösterir. Bir öngörüye tıklayarak detay panelini açabilirsiniz.',
                image: { src: '/help-images/help-analiz-01.png', caption: 'Öngörüler — otomatik bulgular' }
            },
            {
                title: 'Genel Bakış ve Mesai Analizi',
                description: 'Genel Bakış sekmesi KPI ve özet metrikleri sunar. Mesai Analizi sekmesi doluluk oranı, fazla mesai ve eksik saat dağılımını kişi bazında gösterir. Bu iki sekmede ek olarak yıllık trend şeridi görünür.',
                image: { src: '/help-images/help-analiz-02.png', caption: 'Mesai Analizi sekmesi' }
            },
            {
                title: 'Karşılaştırma Sekmesi',
                description: 'Kişi ve ekip kıyaslaması yapabilirsiniz. Mesai doluluğu, çalışma saati, fazla mesai, eksik saat ve mola trendleri aylık grafiklerle karşılaştırılır. "Karşılaştır" alanından kıyaslanacak kişileri seçin.'
            },
            {
                title: 'Fazla Mesai & Yemek ve Talep Analizi',
                description: 'Fazla Mesai & Yemek sekmesi aylık fazla mesai trendi, yemek sipariş sayısı/oranı ve mola analizini içerir. Talep Analizi sekmesi çalışan taleplerini ve yönetici onay sürelerini (SLA) raporlar.'
            },
            {
                title: 'Anomaliler Sekmesi',
                description: 'Z-score tabanlı istatistiksel sapma tespiti yapılır. Ekip ortalamasından belirgin şekilde sapan çalışma desenleri (ör. olağan dışı mesai veya eksik saatler) listelenir.'
            },
            {
                title: 'Favoriler, Dışa Aktarma ve Debug TXT',
                description: 'Sık kullandığınız filtre kombinasyonlarını "Favoriler" ile kaydedip tek tıkla geri yükleyebilirsiniz. "Dışa Aktar" menüsünden Excel, CSV veya PDF indirebilirsiniz. "Debug TXT" düğmesi tüm hesaplamaların ham dökümünü indirir — bir rakamın nereden geldiğini doğrulamak için kullanışlıdır.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Öngörüler sekmesindeki bulgular kurallara dayalı (heuristik) olarak otomatik üretilir. Bir çalışan hakkında aksiyon almadan önce bulguyu detay panelinden ve gerçek kayıtlardan mutlaka doğrulayın.' },
            { type: 'info', text: 'Minimum tamamlama filtresi ile düşük veri günlü çalışanları (ör. işe yeni başlayanlar) analiz dışında bırakabilirsiniz. Bu, ortalamaların yanıltıcı görünmesini engeller.' },
            { type: 'success', text: 'Klavye kısayolları: "?" yardım penceresini açar, "r" verileri yeniler, sol/sağ ok tuşları aylar arasında gezinir, "t" bulunduğunuz aya döner.' },
            { type: 'info', text: 'Analiz aralığı mali dönemlere dayanır (önceki ayın 26\'sı → ayın 25\'i). Takvim ayı ile birebir örtüşmeyebilir.' }
        ],
        faq: [
            { q: 'Ekip Analizi sayfasını neden göremiyorum?', a: 'Bu sayfa yalnızca birincil (PRIMARY) ekibi olan yöneticilere ve sistem yöneticilerine açıktır. Size doğrudan bağlı çalışan tanımlı değilse sayfa görünmez.' },
            { q: 'Öngörülerdeki bir bulgu yanlış görünüyor, ne yapmalıyım?', a: 'Öngörüler otomatik heuristiklerle üretilir ve her zaman bağlamı bilemez. Bulguya tıklayıp detayları inceleyin, ilgili çalışanın puantaj kayıtlarını kontrol edin. Gerçek bir veri hatası varsa sistem yöneticinize bildirin.' },
            { q: 'Analiz verilerini nasıl dışa aktarabilirim?', a: 'Sağ üstteki "Dışa Aktar" menüsünden Excel, CSV veya PDF formatında indirebilirsiniz. Ham hesaplama dökümü için "Debug TXT" düğmesini kullanın.' },
            { q: 'Aylık ve Yıllık görünüm arasındaki fark nedir?', a: 'Aylık görünüm tek bir mali ayı haftalık kırılımla gösterir. Yıllık görünüm seçilen mali yılın 12 aylık özetini sunar; mali yıl seçici üst çubukta yer alır.' },
            { q: 'Anomali tespiti nasıl çalışır?', a: 'Z-score yöntemi kullanılır: her çalışanın metrikleri ekip ortalaması ve standart sapmasına göre değerlendirilir. Belirgin sapma gösteren desenler anomali olarak listelenir.' },
            { q: 'Kaydettiğim favori görünüm nasıl çalışır?', a: 'Favori, o anki filtre ve sekme durumunuzu (adres satırı parametrelerini) kaydeder. Favoriye tıkladığınızda sayfa aynı filtre kombinasyonuyla yeniden yüklenir.' }
        ]
    },
    {
        id: 'onay-surecleri',
        title: 'Onay Süreçleri',
        icon: CheckSquare,
        description: 'Ekibinizden gelen izin, fazla mesai, kartsız giriş ve diğer taleplerin onay/red süreçleri, onay hiyerarşisi ve karar değiştirme. (Yöneticiler ve sistem yöneticileri görebilir)',
        permission: ['APPROVAL_OVERTIME', 'APPROVAL_LEAVE', 'APPROVAL_CARDLESS_ENTRY'],
        link: '/requests',
        images: [
            { src: '/help-images/help-talepler-02.png', caption: 'Gelen Talepler — Onay Bekleyen ve Ekip Talepleri tabloları, tür/durum filtreleri' }
        ],
        steps: [
            {
                title: 'Gelen Talepler Sekmesi',
                description: 'Talepler sayfasındaki "Gelen Talepler" sekmesinde iki tablo bulunur: Onay Bekleyen (kararınızı bekleyen talepler) ve Ekip Talepleri (ekibinizin geçmiş talepleri). Tür ve durum filtreleri, personel seçimi ve son 90 gün aralığı ile listeyi daraltabilirsiniz.',
                image: { src: '/help-images/help-talepler-02.png', caption: 'Gelen Talepler görünümü' }
            },
            {
                title: 'Talebi İnceleme ve Karar Verme',
                description: 'Bekleyen talebin satırına tıklayarak detayları görün: talep türü, tarih/saat aralığı, açıklama ve çalışanın bakiye bilgileri. "Onayla" veya "Reddet" düğmesiyle kararınızı verin; red durumunda gerekçe yazmanız önerilir. Çalışan karar sonrası bildirim alır.'
            },
            {
                title: 'Onay Hiyerarşisi',
                description: 'Sistem onaylayıcıyı şu sırayla bulur: birincil (PRIMARY) yönetici → departman yöneticisi → üst hiyerarşi → departman hiyerarşisi yedeği. Birincil yönetici tüm talep türlerinde yetkilidir; ikincil (CROSS) yönetici yalnızca fazla mesai taleplerinde yetkilidir.'
            },
            {
                title: 'Önceki Kararı Değiştirme',
                description: 'Daha önce onayladığınız veya reddettiğiniz bir talebi Ekip Talepleri tablosunda bulup "Değiştir" ile güncelleyebilirsiniz. Karar değişikliği puantaj ve bakiyeye otomatik yansır.'
            },
            {
                title: 'Yönetici Değişiminde Otomatik Devir',
                description: 'Bir çalışanın birincil yöneticisi değiştiğinde, bekleyen talepleri otomatik olarak yeni yöneticiye devredilir. Bu durumda çalışan, eski yönetici ve yeni yönetici olmak üzere üç taraf da bildirim alır.'
            },
            {
                title: 'Kilitli Dönem Kısıtı',
                description: 'Kilitli mali döneme ait taleplerde onay işlemi engellenir. Kilitlenen dönemdeki bekleyen talepler sistem tarafından otomatik iptal edilir. Kilitli dönem verilerine yalnızca Veri Yönetimi üzerinden müdahale edilebilir.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Kendi talebinizi onaylayamazsınız. Kendi oluşturduğunuz talep, hiyerarşide bir üst onaylayıcıya eskalasyon ile yönlendirilir.' },
            { type: 'info', text: 'Fazla mesai onayı verirken çalışanın haftalık fazla mesai limitini (varsayılan 30 saat, Pazartesi-Pazar sabit takvim haftası) göz önünde bulundurun. Limit, onaylı + bekleyen saatlerin toplamı üzerinden sayılır.' },
            { type: 'info', text: 'Tüm talep türleri için geriye dönük pencere 2 mali aydır. Bu pencerenin dışındaki tarihler için yeni talep oluşturulamaz.' },
            { type: 'success', text: 'Ana sayfadaki üst menüde bekleyen onay sayacı (kırmızı rozet) görünür; tıklayarak doğrudan Gelen Talepler sayfasına gidebilirsiniz.' }
        ],
        faq: [
            { q: 'Bir talep neden bana düştü?', a: 'Siz çalışanın birincil yöneticisisiniz veya hiyerarşi çözümlemesi (departman yöneticisi, üst hiyerarşi ya da departman yedeği) sizi yetkili onaylayıcı olarak belirledi. Fazla mesai taleplerinde ikincil yönetici olarak da atanmış olabilirsiniz.' },
            { q: 'Yanlışlıkla onayladığım talebi geri alabilir miyim?', a: 'Evet. Ekip Talepleri tablosunda ilgili talebi bulun ve "Değiştir" ile kararı güncelleyin. Değişiklik puantaj ve bakiyelere otomatik yansır.' },
            { q: 'İkincil (CROSS) yönetici hangi talepleri onaylayabilir?', a: 'İkincil yönetici yalnızca fazla mesai taleplerinde yetkilidir. İzin, kartsız giriş ve diğer talep türleri birincil yönetici hattından geçer.' },
            { q: 'Kilitli dönemdeki talebi neden onaylayamıyorum?', a: 'Mali dönem kilitlendiğinde o döneme ait talep oluşturma ve onaylama engellenir; bekleyen talepler otomatik iptal edilir. Zorunlu bir düzeltme gerekiyorsa sistem yöneticisi Veri Yönetimi üzerinden işlem yapabilir.' },
            { q: 'İzindeyken taleplerim ne olur?', a: 'Yöneticilik göreviniz için vekalet ataması yapabilirsiniz; vekiliniz sizin adınıza talepleri değerlendirir. Ayrıca yönetici değişiminde bekleyen talepler otomatik devredilir.' },
            { q: 'Onayladığım fazla mesai bordroya nasıl yansır?', a: 'Onaylanan fazla mesai çalışanın günlük puantajına ve aylık çalışma özetine otomatik işlenir. Geçmiş aya ait onaylar da ilgili ayın özetine yansıtılır.' }
        ]
    },
    {
        id: 'raporlar',
        title: 'Raporlar',
        icon: BarChart3,
        description: 'Aylık Mutabakat Raporu: personel bazlı günlük mesai, izin/mazeret, fazla mesai ve dönem bakiyesi özetini Excel veya PDF olarak indirme. (Rapor yetkisine sahip kullanıcılar görebilir)',
        permission: 'PAGE_REPORTS',
        link: '/reports',
        images: [
            { src: '/help-images/help-raporlar-01.png', caption: 'Raporlar sayfası — Aylık Mutabakat Raporu filtreleri ve indirme seçenekleri' }
        ],
        steps: [
            {
                title: 'Rapor Sayfasına Erişim',
                description: 'Sol menüden "Raporlar" sayfasına gidin. Sayfa tek bir rapor sunar: Aylık Mutabakat Raporu. Bu rapor, seçilen mali dönem için personel bazlı günlük mesai, izin/mazeret, fazla mesai ve dönem bakiyesi özetini içerir.',
                image: { src: '/help-images/help-raporlar-01.png', caption: 'Aylık Mutabakat Raporu ekranı' }
            },
            {
                title: 'Filtreleri Belirleme',
                description: 'Dört filtre bulunur: Çalışma Takvimi, Mali Dönem, Departman ve Personel. Önce takvimi ve mali dönemi seçin; ardından isterseniz raporu belirli bir departmana veya tek bir personele daraltın.'
            },
            {
                title: 'Rapor Aralığını Anlama',
                description: 'Rapor aralığı mali dönemdir: önceki ayın 26\'sından ayın 25\'ine kadar. Örneğin Haziran dönemi 26 Mayıs - 25 Haziran aralığını kapsar. Takvim ayı ile karıştırmayın.'
            },
            {
                title: 'Excel veya PDF İndirme',
                description: 'Filtreleri belirledikten sonra Excel ya da PDF formatında raporu indirin. Excel formatı veri işlemeye, PDF formatı yazdırma ve arşivlemeye uygundur.'
            },
            {
                title: 'Açık Dönem Uyarısını Dikkate Alma',
                description: 'Henüz kapanmamış (açık) bir mali dönem için rapor aldığınızda veriler "değişebilir" notuyla gelir: devam eden onaylar, yeni talepler ve canlı puantaj hesaplamaları raporu sonradan değiştirebilir. Kesin mutabakat için dönemin kapanmasını bekleyin.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Personel filtresi seçmeden tüm şirket için rapor almak, çalışan sayısına bağlı olarak uzun sürebilir. Mümkünse departman veya personel filtresi kullanın.' },
            { type: 'info', text: 'Grafikli ve karşılaştırmalı detaylı analiz için Ekip Analizi sayfasını kullanın; bu sayfa yalnızca mutabakat özetine odaklanır.' },
            { type: 'info', text: 'Tüm çalışanların izin, mesai ve kart verilerini tablo halinde incelemek isterseniz Muhasebe Paneli daha uygundur (PAGE_ACCOUNTING yetkisi gerekir).' },
            { type: 'success', text: 'Kapanmış (kilitli) dönemlerin raporları sabittir ve sonradan değişmez; bordro mutabakatını bu raporlar üzerinden yapabilirsiniz.' }
        ],
        faq: [
            { q: 'Rapordaki dönem neden takvim ayıyla örtüşmüyor?', a: 'Rapor mali dönem esaslıdır: önceki ayın 26\'sı ile ayın 25\'i arasını kapsar. Bu, şirketin bordro döngüsüyle uyumludur.' },
            { q: 'Açık dönem raporundaki rakamlar neden sonra değişti?', a: 'Dönem henüz kapanmadığı için devam eden onaylar, yeni talepler ve puantaj yeniden hesaplamaları raporu etkileyebilir. Kesin rakamlar için dönem kapandıktan sonra raporu yeniden alın.' },
            { q: 'Daha detaylı grafik ve trend analizi nereden alabilirim?', a: 'Ekip Analizi sayfasında doluluk, fazla mesai, karşılaştırma ve anomali sekmeleriyle çok daha detaylı analiz yapabilirsiniz. Raporlar sayfası yalnızca mutabakat özetini sunar.' },
            { q: 'Tek bir çalışanın tüm talep detaylarını nasıl görürüm?', a: 'Muhasebe Paneli\'ndeki "Çalışan Detayı" sekmesinde kişi ve aralık seçerek izin, mesai, yemek, kartsız giriş ve puantaj kayıtlarının tamamını inceleyebilirsiniz.' },
            { q: 'Rapor indirme uzun sürüyor, normal mi?', a: 'Tüm şirket kapsamındaki raporlarda evet, hesaplama çalışan sayısıyla orantılı sürer. Departman veya personel filtresiyle kapsamı daraltarak süreyi kısaltabilirsiniz.' }
        ]
    },
    {
        id: 'muhasebe-paneli',
        title: 'Muhasebe Paneli',
        icon: Calculator,
        description: 'Tüm çalışanların izin, fazla mesai, kart verisi ve durumlarını salt-okunur görüntüleme; kişi bazlı detay ve TXT dışa aktarma. (Muhasebe yetkisine sahip kullanıcılar ve sistem yöneticileri görebilir)',
        permission: 'PAGE_ACCOUNTING',
        link: '/accounting',
        images: [
            { src: '/help-images/help-muhasebe-01.png', caption: 'Genel Bakış sekmesi — özet kartlar ve çalışan tablosu' },
            { src: '/help-images/help-muhasebe-02.png', caption: 'Çalışan Detayı sekmesi — kişi bazlı tüm talep türleri ve bakiyeler' },
            { src: '/help-images/help-muhasebe-03.png', caption: 'İzinler sekmesi — dönem içi izin kayıtları' }
        ],
        steps: [
            {
                title: 'Panele Erişim ve Dönem Seçimi',
                description: 'Sol menüden "Muhasebe Paneli" sayfasına gidin. Üst çubuktan Çalışma Takvimi ve Mali Dönem seçin; isterseniz serbest tarih aralığı da belirleyebilirsiniz. İsim veya sicil kodu ile arama yaparak listeleri daraltın. Panel salt-okunurdur: veri değiştirmez, yalnızca görüntüler.',
                image: { src: '/help-images/help-muhasebe-01.png', caption: 'Genel Bakış ve üst filtre çubuğu' }
            },
            {
                title: 'Genel Bakış Sekmesi',
                description: 'Dönemin özet kartları ve tüm çalışanların durum tablosu görüntülenir. Bir çalışan satırına tıkladığınızda kişi detay paneli (drawer) açılır; buradan kişinin kart verilerine de geçebilirsiniz.'
            },
            {
                title: 'İzinler, Mesailer ve Kart Verileri Sekmeleri',
                description: 'İzinler sekmesi dönem içi izin kayıtlarını, Mesailer sekmesi fazla mesai taleplerini, Kart Verileri sekmesi ham kart giriş/çıkış kayıtlarını listeler. Tüm sekmeler üst çubuktaki dönem ve arama filtrelerini kullanır.',
                image: { src: '/help-images/help-muhasebe-03.png', caption: 'İzinler sekmesi' }
            },
            {
                title: 'Çalışan Detayı Sekmesi',
                description: 'Kişi ve aralık seçerek o çalışanın tüm kayıtlarını bir arada inceleyin: İzinler, Dış Görev, Fazla Mesai, Yemek, Kartsız Giriş, Günlük Puantaj, Ham Kart ve İzin Bakiyesi bölümleri. Tür çipleriyle bölümleri gösterip gizleyebilir, her tabloda durum filtresi uygulayabilir, satıra tıklayarak detayı açabilirsiniz.',
                image: { src: '/help-images/help-muhasebe-02.png', caption: 'Çalışan Detayı sekmesi' }
            },
            {
                title: 'TXT Dışa Aktarma',
                description: 'Üst çubuktaki "TXT İndir" düğmesi, seçili dönem ve arama filtresine göre tüm listeyi metin dosyası olarak indirir. Çalışan Detayı sekmesinde veya kişi panelinde ise yalnızca o kişinin dökümünü indirebilirsiniz.'
            }
        ],
        tips: [
            { type: 'info', text: 'Panel tamamen salt-okunurdur. Veri düzeltmesi gerekiyorsa ilgili talep süreçlerini veya sistem yöneticisi araçlarını (Veri Yönetimi) kullanın.' },
            { type: 'info', text: 'Mali dönem aralığı önceki ayın 26\'sından ayın 25\'ine kadardır. Farklı bir aralık gerekiyorsa üst çubuktaki opsiyonel serbest tarih aralığını kullanın.' },
            { type: 'success', text: 'Sekmeler ilk açıldıklarında yüklenir ve sekmeler arasında geçiş yaptığınızda filtre/seçim durumunuz korunur; tekrar yükleme beklemezsiniz.' },
            { type: 'warning', text: 'Açık (kilitlenmemiş) dönem verileri canlı hesaplamalara bağlı olarak değişebilir. Bordro mutabakatını kapanmış dönem verileri üzerinden yapın.' }
        ],
        faq: [
            { q: 'Muhasebe Paneli\'nden veri düzeltebilir miyim?', a: 'Hayır. Panel salt-okunur görüntüleme içindir. Düzeltme gerektiğinde ilgili talep süreçleri kullanılmalı veya sistem yöneticisi Veri Yönetimi üzerinden işlem yapmalıdır.' },
            { q: 'Bir çalışanın izin bakiyesini nereden görürüm?', a: 'Çalışan Detayı sekmesinde kişiyi seçin; "İzin Bakiyesi" bölümünde yıllık izin ve diğer bakiyeler görüntülenir. Ayrıca yemek, kartsız giriş ve dış görev kayıtları da aynı ekranda listelenir.' },
            { q: 'TXT dosyası neyi içerir?', a: 'Üst çubuktan indirilen TXT, seçili dönem ve arama filtresine göre tüm çalışan listesinin dökümünü içerir. Kişi bazlı TXT ise yalnızca seçilen çalışanın kayıtlarını kapsar.' },
            { q: 'Serbest tarih aralığı ile mali dönem arasındaki fark nedir?', a: 'Mali dönem sabit bordro aralığıdır (26\'sı - 25\'i). Serbest tarih aralığı opsiyoneldir ve istediğiniz iki tarih arasını görüntülemenizi sağlar; ör. tek bir hafta veya çeyrek dönem.' },
            { q: 'Kart Verileri sekmesinde neyi görürüm?', a: 'Çalışanların ham kart giriş/çıkış olaylarını görürsünüz. Genel Bakış\'taki kişi panelinden "Kart Verilerini Gör" ile doğrudan o kişinin kart kayıtlarına geçebilirsiniz.' },
            { q: 'Rakamlar Raporlar sayfasındaki mutabakat raporuyla neden farklı olabilir?', a: 'Açık dönemde veriler canlı hesaplamalarla değişebilir; iki ekrana farklı anlarda bakıldıysa küçük farklar görülebilir. Kapanmış dönemlerde her iki kaynak da aynı sabit verileri gösterir.' }
        ]
    },
{
        id: 'calisanlar',
        title: 'Çalışanlar',
        icon: Users,
        description: 'Personel listesi, yeni çalışan ekleme, bilgi düzenleme, yönetici atamaları ve pasife alma işlemleri. (Yöneticiler ve sistem yöneticileri görebilir)',
        permission: 'PAGE_EMPLOYEES',
        link: '/employees',
        images: [
            { src: '/help-images/help-calisanlar-01.png', caption: 'Personel Yönetimi sayfası — departman ağacı görünümlü personel listesi, Pasif Göster / Yönet / Yeni Ekle düğmeleri' },
            { src: '/help-images/help-calisanlar-02.png', caption: 'Yeni çalışan ekleme sihirbazı — adım adım kayıt formu' }
        ],
        steps: [
            {
                title: 'Personel Listesini Görüntüleme',
                description: 'Sayfa, çalışanları departman ağacı yapısında listeler. Arama kutusuyla isim arayabilir, departman, pozisyon ve rol süzgeçleriyle listeyi daraltabilirsiniz. Varsayılan olarak yalnızca aktif çalışanlar görünür; "Pasif Göster" düğmesiyle pasife alınmış çalışanları da listeleyebilirsiniz.',
                image: { src: '/help-images/help-calisanlar-01.png', caption: 'Departman ağacı görünümlü personel listesi' }
            },
            {
                title: 'Yeni Çalışan Ekleme',
                description: '"Yeni Ekle" düğmesine tıklayın. 7 adımlı sihirbaz açılır: (1) Kişisel Bilgiler, (2) Kurumsal Bilgiler, (3) İletişim & Acil, (4) Detaylar & Yetkinlik, (5) İzin Yönetimi, (6) Yetkilendirme, (7) Önizleme & Onay. Son adımda tüm bilgileri kontrol edip kaydı tamamlayın.',
                image: { src: '/help-images/help-calisanlar-02.png', caption: 'Yeni çalışan ekleme formu' }
            },
            {
                title: 'Yönetici Atamaları',
                description: 'Kurumsal Bilgiler adımında birincil ve ikincil yöneticileri atarsınız. En az bir birincil yönetici atanmalıdır; ilk birincil yönetici ana raporlama hattı olarak kullanılır ve çalışanın talepleri (izin, mesai, kartsız giriş) onay için bu yöneticiye gider.'
            },
            {
                title: 'Çalışan Bilgilerini Düzenleme',
                description: 'Listede çalışan satırının üzerine gelin ve kalem (Düzenle) simgesine tıklayın. Kişisel bilgiler, departman/pozisyon, yönetici atamaları, mali takvim, servis kullanımı, haftalık fazla mesai limiti, izin bakiyeleri ve yetkiler buradan güncellenir.'
            },
            {
                title: 'Detaylar & Yetkinlik Ayarları',
                description: 'Bu adımda çalışma tipi, mali takvim ataması, servis kullanımı (ve isteğe bağlı servis toleransı dakikası) ile haftalık fazla mesai limiti (varsayılan 30 saat) tanımlanır. Haftalık limit Pazartesi-Pazar takvim haftasında onaylı + bekleyen mesai toplamına uygulanır.'
            },
            {
                title: 'Çalışanı Pasife Alma',
                description: '"Yönet" düğmesiyle yönetim modunu açın. Çalışan satırında turuncu "Pasife Al" simgesi belirir. Tıkladığınızda onay penceresi açılır; onaylarsanız çalışan pasife alınır ve sisteme giriş yapamaz. Pasif çalışanı daha sonra tekrar aktife alabilirsiniz.'
            }
        ],
        tips: [
            { type: 'info', text: 'Birincil yönetici değiştiğinde çalışanın BEKLEYEN talepleri otomatik olarak yeni yöneticiye devredilir. Bu durumda çalışan, eski yönetici ve yeni yönetici olmak üzere üç taraf da bildirim alır.' },
            { type: 'warning', text: 'Pasife alma işlemi çalışanın sistem erişimini kapatır. Silme yerine pasife alma kullanılır; geçmiş puantaj ve talep kayıtları korunur.' },
            { type: 'info', text: 'Servis toleransı çalışan bazında yalnızca servis kullanan (uses_service) çalışanlar için geçerlidir; giriş/çıkış saatlerini vardiya sınırına yuvarlar. Diğer tolerans değerleri çalışan üzerinden değil, mali takvimden okunur.' },
            { type: 'success', text: 'İzin Yönetimi adımında yıllık izin bakiyesi, avans izin limiti ve yıllık hak ediş oranı tanımlanır. İşe giriş tarihi kıdem ve hak ediş hesabında kullanılır.' }
        ],
        faq: [
            { q: 'Yeni eklediğim çalışan sisteme nasıl giriş yapar?', a: 'Kayıt sırasında oluşturulan kullanıcı adı (veya e-posta) ve ilk şifre ile giriş yapar. İlk girişten sonra çalışan şifresini Profilim sayfasından değiştirebilir.' },
            { q: 'Bir çalışanın yöneticisini değiştirirsem bekleyen talepleri ne olur?', a: 'Bekleyen talepler otomatik olarak yeni birincil yöneticiye devredilir. Çalışan, eski ve yeni yönetici bildirim alır; talepler kaybolmaz.' },
            { q: 'Pasife alınan çalışanın verileri silinir mi?', a: 'Hayır. Puantaj, izin ve talep geçmişi korunur; yalnızca sistem erişimi kapanır ve listede pasif olarak işaretlenir. "Pasif Göster" ile görüntüleyebilirsiniz.' },
            { q: '"Pasife Al" düğmesini göremiyorum, neden?', a: 'Önce sağ üstteki "Yönet" düğmesiyle yönetim modunu açmanız gerekir. Ayrıca PAGE_EMPLOYEES yetkiniz olmalı ve admin kullanıcılar pasife alınamaz.' },
            { q: 'Çalışanın haftalık fazla mesai limitini nasıl değiştiririm?', a: 'Çalışanı düzenleyin ve Detaylar & Yetkinlik adımındaki haftalık fazla mesai limiti alanını güncelleyin. Varsayılan 30 saattir; limit Pazartesi-Pazar sabit takvim haftasında onaylı + bekleyen mesai toplamına uygulanır ve her Pazartesi sıfırlanır.' },
            { q: 'Birden fazla yönetici atayabilir miyim?', a: 'Evet. Birden fazla birincil ve ikincil (fonksiyonel/proje) yönetici atanabilir. Onay akışında ilk birincil yönetici ana raporlama hattıdır.' }
        ]
    },
    {
        id: 'calisma-programlari',
        title: 'Çalışma Takvimleri',
        icon: CalendarRange,
        description: 'Mali takvim yönetimi: vardiya şablonları, yıllık takvim, tatiller, dönem ayarları ve personel atamaları. (Yöneticiler ve sistem yöneticileri görebilir)',
        permission: 'PAGE_WORK_SCHEDULES',
        link: '/work-schedules',
        images: [
            { src: '/help-images/help-program-01.png', caption: 'Mali Takvim Yönetimi — takvim listesi ve Şablonlar sekmesi' },
            { src: '/help-images/help-program-02.png', caption: 'Yıllık Takvim görünümü — günlere şablon atama' }
        ],
        steps: [
            {
                title: 'Takvim Seçimi ve Sekmeler',
                description: 'Sayfada önce üstten bir mali takvim seçin. Beş alt sekme bulunur: Şablonlar, Yıllık Takvim, Tatiller, Dönemler & Ayarlar ve Personel. Tüm ayarlar seçili takvime aittir; farklı çalışan grupları için farklı takvimler tanımlanabilir.',
                image: { src: '/help-images/help-program-01.png', caption: 'Takvim listesi ve sekmeler' }
            },
            {
                title: 'Vardiya Şablonları Oluşturma',
                description: 'Şablonlar sekmesinde vardiya şablonları tanımlanır: gün başlangıç/bitiş saatleri ve tatil günleri. Sistem hiyerarşisi şöyledir: Takvim → Vardiya Şablonu → Gün Ataması. Bir şablonu birden çok güne atayarak yıl planını hızla kurabilirsiniz.'
            },
            {
                title: 'Yıllık Takvimde Gün Ataması',
                description: 'Yıllık Takvim sekmesinde yılın günlerini görürsünüz. Günlere şablon atayarak hangi günün hangi vardiyayla çalışılacağını belirlersiniz. Birden fazla günü seçip toplu kaydedebilirsiniz.',
                image: { src: '/help-images/help-program-02.png', caption: 'Yıllık takvim gün atamaları' }
            },
            {
                title: 'Dönemler & Ayarlar',
                description: 'Bu sekmede mali dönemler ve takvim ayarları yönetilir. Varsayılan mali dönem kuralı: önceki ayın 26\'sı ile ilgili ayın 25\'i arasıdır. Tolerans değerleri (normal tolerans, servis toleransı, minimum fazla mesai eşiği) de takvim düzeyinde burada tanımlanır.'
            },
            {
                title: 'Personel Ataması',
                description: 'Personel sekmesinde bu takvime bağlı çalışanları görür ve atama yaparsınız. Bir çalışanın vardiya kuralları, tatilleri ve tolerans değerleri bağlı olduğu takvimden okunur.'
            },
            {
                title: 'Kaydet & Hesapla',
                description: '"Kaydet & Hesapla" düğmesi değişiklikleri kaydeder ve etkilenen günleri arka planda yeniden hesaplatır. İlerleme çubuğunda kaç personelin işlendiğini görürsünüz. Pencereyi kapatabilirsiniz; hesaplama arka planda devam eder.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Takvim değişiklikleri geçmiş günlerin puantajını da etkileyebilir. "Kaydet & Hesapla" sonrası ilerleme durumunu ve varsa hata mesajlarını kontrol edin.' },
            { type: 'info', text: 'Tüm tolerans değerleri (normal tolerans 30 dk, servis toleransı ~15 dk, minimum fazla mesai eşiği 30 dk) takvimden okunur. Çalışan düzeyinde yalnızca servis toleransı ayrıca tanımlanabilir.' },
            { type: 'info', text: 'Hesaplama asenkron çalışır: kuyruğa alınır, personel personel işlenir. Büyük takvimlerde işlem birkaç dakika sürebilir; bu sırada sayfayı kapatmanız hesaplamayı durdurmaz.' },
            { type: 'success', text: 'Farklı çalışma düzenleri (ör. ofis ve saha ekipleri) için ayrı takvimler oluşturup Personel sekmesinden ilgili çalışanları atayabilirsiniz.' }
        ],
        faq: [
            { q: 'Takvim, şablon ve gün ataması arasındaki fark nedir?', a: 'Takvim en üst kapsayıcıdır (dönemler, tatiller, toleranslar). Şablon bir günün vardiya saatlerini tanımlar. Gün ataması ise takvimdeki belirli bir güne hangi şablonun uygulanacağını belirler.' },
            { q: 'Kaydet & Hesapla ne kadar sürer?', a: 'Personel sayısına ve etkilenen gün aralığına bağlıdır. İşlem arka planda kuyrukta çalışır; ilerleme çubuğu işlenen personel sayısını gösterir. Pencereyi kapatsanız da hesaplama devam eder.' },
            { q: 'Mali dönem tarihleri nasıl belirlenir?', a: 'Varsayılan kural: önceki ayın 26\'sından ilgili ayın 25\'ine kadardır (Türk bordro döngüsü). Dönemler & Ayarlar sekmesinden dönem bilgileri yönetilir.' },
            { q: 'Bir çalışanın vardiyası hangi kaynaktan okunur?', a: 'Çalışanın bağlı olduğu mali takvimdeki gün atamasından (şablon üzerinden). Tek bir gün için istisna gerekiyorsa günlük istisna (override) tanımlanabilir.' },
            { q: 'Hesaplama sırasında hata oluşursa ne yapmalıyım?', a: 'Sonuç penceresi "Hesaplama Başarısız" veya "hatalarla tamamlandı" uyarısı gösterir. Hata mesajını ve logları inceleyin; sorun düzeltilince tekrar Kaydet & Hesapla çalıştırabilirsiniz.' }
        ]
    },
    {
        id: 'resmi-tatiller',
        title: 'Resmi Tatiller',
        icon: PartyPopper,
        description: 'Tam gün ve yarım gün resmi tatil tanımlama, kesim saati yönetimi ve tatillerin puantaja etkisi. (Yöneticiler ve sistem yöneticileri görebilir)',
        permission: 'PAGE_WORK_SCHEDULES',
        link: '/public-holidays',
        images: [
            { src: '/help-images/help-tatiller-01.png', caption: 'Resmi Tatiller sayfası — tatil listesi ve yeni tatil ekleme' }
        ],
        steps: [
            {
                title: 'Tatil Listesini Görüntüleme',
                description: 'Sayfada tanımlı resmi tatiller tarih sırasıyla listelenir. Her tatilin tam gün mü yarım gün mü olduğu görünür.',
                image: { src: '/help-images/help-tatiller-01.png', caption: 'Tatil listesi' }
            },
            {
                title: 'Tam Gün Tatil Ekleme',
                description: 'Yeni tatil eklerken tarih ve ad girin, tam gün seçin. Tam gün tatilde o günün çalışma hedefi düşer ve o gün yapılan tüm çalışma fazla mesai olarak algılanır.'
            },
            {
                title: 'Yarım Gün Tatil ve Kesim Saati',
                description: 'Yarım gün tatilde (ör. arife günü) kesim saati girilir: bu saate kadar normal mesai, bu saatten sonraki çalışma fazla mesai sayılır. Onaylı dış görevlerde de kesim saatinden sonraki görev çalışması fazla mesai olarak hesaplanır.'
            },
            {
                title: 'Kesim Saatini Boş Bırakmayın',
                description: 'Yarım gün tatilde kesim saati boş bırakılırsa sistem uyarı verir ve raporlarda bu tatil TANIMSIZ görünür. Yarım gün tatil eklerken kesim saatini mutlaka girin.'
            },
            {
                title: 'Takvim Bazlı Tatil Ataması',
                description: 'Tatiller takvim bazında atanabilir: bir mali takvimin kendi tatil listesi varsa o liste kullanılır; takvimin tatil listesi boşsa genel tatil listesi geçerli olur. Böylece farklı çalışan grupları için farklı tatil düzenleri tanımlanabilir.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Yarım gün tatilde kesim saatini boş bırakmayın. Boş kalırsa raporlarda TANIMSIZ görünür ve fazla mesai hesabı belirsiz kalır.' },
            { type: 'info', text: 'Tatil günleri aylık puantaj hedefini otomatik düşürür. Tatil gününde yapılan çalışma potansiyel fazla mesai olarak algılanır ve talep/onay sürecine girer.' },
            { type: 'success', text: 'Tatil ekledikten sonra Çalışma Takvimleri sayfasından "Kaydet & Hesapla" ile etkilenen günleri yeniden hesaplatarak değişikliğin puantaja yansımasını sağlayabilirsiniz.' }
        ],
        faq: [
            { q: 'Tatil günü çalışan personelin mesaisi nasıl hesaplanır?', a: 'Tam gün tatilde günün tüm çalışması, yarım gün tatilde kesim saatinden sonraki çalışma fazla mesai olarak algılanır. Fazla mesai normal onay sürecinden geçer.' },
            { q: 'Yarım gün tatilde kesim saati ne anlama gelir?', a: 'Kesim saatine kadar olan süre normal mesai kabul edilir; kesim saatinden sonraki çalışma fazla mesai sayılır. Örneğin kesim 13:00 ise 13:00 sonrası çalışma fazla mesaidir.' },
            { q: 'Tatil eklemek geçmiş kayıtları etkiler mi?', a: 'Tatil tanımı günün hedefini ve fazla mesai algısını değiştirir. Geçmiş bir tarihe tatil eklediyseniz etkilenen günlerin yeniden hesaplanması gerekir.' },
            { q: 'Farklı takvimlere farklı tatiller tanımlayabilir miyim?', a: 'Evet. Her mali takvimin kendi tatil listesi olabilir. Takvimin tatil listesi boşsa genel tatil listesi kullanılır.' },
            { q: 'Tatil günü puantaj hedefine dahil mi?', a: 'Hayır. Tam gün tatil o günün çalışma hedefini sıfırlar, yarım gün tatil hedefi kesim saatine göre azaltır. Bu nedenle tatil günleri aylık hedefi düşürür.' }
        ]
    },
    {
        id: 'saglik-raporlari',
        title: 'Sağlık Raporları',
        icon: HeartPulse,
        description: 'Çok günlü sağlık raporu kayıtları, raporlu günlerin puantaja etkisi ve hastane ziyareti ayrımı. (Yöneticiler ve sistem yöneticileri görebilir)',
        permission: 'PAGE_HEALTH_REPORTS',
        link: '/health-reports',
        images: [
            { src: '/help-images/help-saglik-01.png', caption: 'Sağlık Raporları sayfası — rapor listesi ve yeni kayıt ekleme' }
        ],
        steps: [
            {
                title: 'Rapor Listesini Görüntüleme',
                description: 'Sayfada çalışanların sağlık raporu kayıtları listelenir. Çalışan adı, tarih aralığı ve durum bilgilerini görebilirsiniz.',
                image: { src: '/help-images/help-saglik-01.png', caption: 'Sağlık raporu listesi' }
            },
            {
                title: 'Çok Günlü Rapor Kaydı Oluşturma',
                description: 'Yeni kayıt oluştururken çalışanı seçin ve raporun başlangıç-bitiş tarihlerini girin. Rapor birden çok günü kapsayabilir; kapsanan her raporlu gün puantajda ayrı ayrı işlenir.'
            },
            {
                title: 'Raporlu Günlerin Puantaja Etkisi',
                description: 'Raporlu günler devamsızlık sayılmaz ve o günlerin mesai eksiğini düşürür. Raporlu süre normal çalışmaya eklenmez; bordro raporlarında ayrı bir kalem olarak (Raporlu/İzinli) gösterilir.'
            },
            {
                title: 'Çalışanın Kendi Raporunu Yüklemesi',
                description: 'Çalışanlar kendi sağlık raporlarını Talepler > Yeni Talep > Sağlık Raporu adımıyla da yükleyebilir. Bu talepler onay sürecinden geçer; onaylandığında raporlu günler puantaja yansır.'
            },
            {
                title: 'Hastane Ziyareti Ayrımı',
                description: 'Hastane ziyareti (saatlik sağlık izni) ayrı bir türdür: tam gün rapor yerine gün içindeki birkaç saatlik sağlık devamsızlığını kapsar. Çok günlü rapor ile karıştırmayın; doğru türü seçin.'
            }
        ],
        tips: [
            { type: 'info', text: 'Raporlu gün devamsızlık olarak işaretlenmez ve günün mesai eksiğini düşürür; ancak normal çalışma süresine eklenmez. Bordroda ayrı kategori olarak görünür.' },
            { type: 'success', text: 'Çalışanlar raporlarını beklemeden kendileri yükleyebilir: Talepler > Yeni Talep > Sağlık Raporu. Böylece kayıt gecikmeden puantaja yansır.' },
            { type: 'warning', text: 'Saatlik sağlık devamsızlığı için çok günlü rapor yerine hastane ziyareti türünü kullanın. Yanlış tür seçimi günün hedef hesabını olması gerekenden fazla düşürebilir.' }
        ],
        faq: [
            { q: 'Raporlu gün devamsızlık sayılır mı?', a: 'Hayır. Raporlu günler devamsızlık sayılmaz ve o günlerin mesai eksiğini düşürür. Bordro raporlarında ayrı kalem olarak gösterilir.' },
            { q: 'Çalışan kendi raporunu nasıl yükler?', a: 'Talepler sayfasından Yeni Talep > Sağlık Raporu seçeneğiyle tarih aralığını ve rapor belgesini iletir. Kayıt onaylandığında puantaja yansır.' },
            { q: 'Hastane ziyareti ile sağlık raporu arasındaki fark nedir?', a: 'Sağlık raporu tam gün(ler)i kapsar; hastane ziyareti gün içindeki saatlik sağlık devamsızlığıdır. İkisi ayrı tür olarak kaydedilir ve puantajda farklı işlenir.' },
            { q: 'Raporlu süre normal çalışma olarak sayılır mı?', a: 'Hayır. Raporlu süre normal çalışmaya eklenmez; yalnızca günün eksiğini kapatır ve bordroda ayrı gösterilir. Böylece raporlu gün fazla mesai üretmez.' },
            { q: 'Raporlu günler takvim görünümlerinde görünür mü?', a: 'Evet. Raporlu günler takvim ve Veri Yönetimi görünümlerinde mor RAPORLU rozetiyle işaretlenir.' }
        ]
    },
    {
        id: 'ozel-izinler',
        title: 'Özel İzinler',
        icon: Gift,
        description: 'Yasal ve özel izin kayıtlarının (evlilik, babalık, ölüm, ücretsiz izin) yönetimi ve onay süreçleri. (Yöneticiler ve sistem yöneticileri görebilir)',
        permission: 'PAGE_SPECIAL_LEAVES',
        link: '/special-leaves',
        images: [
            { src: '/help-images/help-ozel-izin-01.png', caption: 'Özel İzinler sayfası — izin listesi, durum süzgeçleri ve özet kartları' }
        ],
        steps: [
            {
                title: 'Özel İzin Türleri',
                description: 'Dört özel izin türü yönetilir: Evlilik İzni, Babalık İzni, Ölüm İzni ve Ücretsiz İzin. Her tür listede renkli rozetle ayırt edilir.',
                image: { src: '/help-images/help-ozel-izin-01.png', caption: 'Özel izin listesi ve tür rozetleri' }
            },
            {
                title: 'Listeyi Süzme ve Arama',
                description: 'Üstteki özet kartları toplam, bekleyen, onaylanan ve reddedilen sayılarını gösterir. Arama kutusu, durum süzgeci ve tarih aralığı ile listeyi daraltabilirsiniz.'
            },
            {
                title: 'Talep Detayı ve Belgeler',
                description: 'Bir kaydın detayını açarak tarih aralığını, açıklamayı ve varsa ekli belgeleri görüntüleyebilirsiniz. Belgeler tarayıcıda açılabilir veya indirilebilir.'
            },
            {
                title: 'Onaylama ve Reddetme',
                description: 'Bekleyen (Onay Bekliyor) kayıtları onaylayabilir veya reddedebilirsiniz. Reddetme işleminde gerekçe girilmesi istenir; gerekçe çalışana iletilir.'
            },
            {
                title: 'Onaylı İznin Puantaja Etkisi',
                description: 'Onaylanan özel izin, kapsadığı günlerin çalışma hedefini düşürür. İzinli günler takvim ve Veri Yönetimi görünümlerinde ÖZEL rozetiyle (cyan) işaretlenir.'
            }
        ],
        tips: [
            { type: 'info', text: 'Özel izin durum akışı: Onay Bekliyor → Onaylandı / Reddedildi / İptal Edildi. Yalnızca onaylı izinler puantaj hedefini etkiler.' },
            { type: 'warning', text: 'Reddetme işleminde gerekçe girmeniz gerekir. Açık ve anlaşılır bir gerekçe yazın; çalışan bu gerekçeyi görür.' },
            { type: 'success', text: 'Evlilik cüzdanı, doğum belgesi gibi destekleyici belgeler kayda eklenebilir ve detay penceresinden görüntülenip indirilebilir.' },
            { type: 'info', text: 'Ücretsiz izin de bu sayfadan yönetilir; diğer türler gibi onay sürecinden geçer ve onaylandığında ilgili günlerin hedefini düşürür.' }
        ],
        faq: [
            { q: 'Hangi izin türleri özel izin kapsamındadır?', a: 'Evlilik İzni, Babalık İzni, Ölüm İzni ve Ücretsiz İzin. Yıllık izin ve mazeret izni ise Talepler sayfasındaki normal izin akışından yürütülür.' },
            { q: 'Onaylı özel izin çalışanın hedefini nasıl etkiler?', a: 'İzin kapsamındaki günlerin çalışma hedefi düşer; çalışan o günler için eksik mesai yazmaz. İzinli günler takvimde rozetle görünür.' },
            { q: 'Özel izin yıllık izin bakiyesinden düşer mi?', a: 'Hayır. Özel izinler yasal haklardır ve yıllık izin bakiyesinden ayrı izlenir.' },
            { q: 'Reddedilen bir özel izin tekrar talep edilebilir mi?', a: 'Evet. Reddedilen kayıt kapanır; gerekiyorsa doğru bilgi ve belgelerle yeni bir kayıt oluşturulabilir.' },
            { q: 'Ekli belgeleri kimler görebilir?', a: 'Bu sayfaya erişim yetkisi (PAGE_SPECIAL_LEAVES) olan yöneticiler detay penceresinden belgeleri görüntüleyip indirebilir.' }
        ]
    },
    {
        id: 'sistem-mesajlari',
        title: 'Sistem Mesajları',
        icon: Megaphone,
        description: 'Tüm kullanıcılara veya seçili kişilere zamanlanmış duyuru pop-up mesajları oluşturma ve yönetme. (Sistem yöneticileri görebilir)',
        permission: 'PAGE_SYSTEM_MESSAGES',
        link: '/admin/system-messages',
        images: [
            { src: '/help-images/help-sistem-mesaj-01.png', caption: 'Sistem Mesajları listesi — durum rozetleri ve Yeni Mesaj düğmesi' },
            { src: '/help-images/help-sistem-mesaj-02.png', caption: 'Yeni mesaj formu — başlık, içerik, öncelik, hedef ve tarih penceresi' }
        ],
        steps: [
            {
                title: 'Mesaj Listesini Görüntüleme',
                description: 'Sayfada tüm sistem mesajları durum rozetleriyle listelenir: Pasif, Zamanlanmış (başlangıç tarihi gelmemiş), Aktif (pencere içinde) ve Süresi Doldu (bitiş geçmiş).',
                image: { src: '/help-images/help-sistem-mesaj-01.png', caption: 'Mesaj listesi ve durum rozetleri' }
            },
            {
                title: 'Yeni Mesaj Oluşturma',
                description: '"Yeni Mesaj" düğmesine tıklayın. Formda başlık ve içerik metnini girin, öncelik seviyesini seçin: Bilgi (mavi), Uyarı (turuncu) veya Kritik (kırmızı).',
                image: { src: '/help-images/help-sistem-mesaj-02.png', caption: 'Yeni mesaj formu' }
            },
            {
                title: 'Hedef Kullanıcı Seçimi',
                description: 'Mesajı tüm kullanıcılara ya da seçili kişilere gönderebilirsiniz. Seçili kişiler modunda arama kutusuyla çalışanları bulup çoklu seçim yaparsınız.'
            },
            {
                title: 'Yayın Penceresi Belirleme',
                description: 'Başlangıç ve bitiş tarih-saatini girin. Mesaj yalnızca bu pencere içinde gösterilir: pencere başlamadan Zamanlanmış, pencere içinde Aktif, bitişten sonra Süresi Doldu durumuna geçer. Saatler İstanbul saatine göre yorumlanır.'
            },
            {
                title: 'Pop-up Davranışı',
                description: 'Pencere içindeyken hedef kullanıcılar uygulamayı her açtığında mesaj pop-up olarak gösterilir. Kullanıcı "Bir daha gösterme" derse mesaj o kullanıcı için kalıcı olarak kapanır (sunucuda kaydedilir); "Kapat" derse yalnızca o oturumda gizlenir, sonraki açılışta tekrar görünür.'
            },
            {
                title: 'Aktif/Pasif, Düzenleme ve Silme',
                description: 'Listeden bir mesajı açıp kapatabilir (aktif/pasif düğmesi), içeriğini düzenleyebilir veya silebilirsiniz. Pasife alınan mesaj penceresi devam etse bile gösterilmez.'
            }
        ],
        tips: [
            { type: 'info', text: 'Öncelik seviyeleri görsel ayrımdır: Bilgi mavi, Uyarı turuncu, Kritik kırmızı gösterilir. Acil duyurular için Kritik seviyeyi kullanın.' },
            { type: 'warning', text: '"Bir daha gösterme" seçimi kullanıcı bazında kalıcıdır. Aynı mesajın içeriğini güncelleseniz bile bu kullanıcılar mesajı tekrar görmez; önemli değişiklik için yeni mesaj oluşturun.' },
            { type: 'success', text: 'Mesajı ileri bir tarihe zamanlayabilirsiniz: başlangıç tarihi gelene kadar Zamanlanmış durumunda bekler ve otomatik olarak yayına girer.' },
            { type: 'info', text: 'Form saatleri İstanbul saatine göre çalışır. Bitiş saatini kontrol edin; bitiş geçtiğinde mesaj otomatik olarak Süresi Doldu durumuna geçer ve gösterilmez.' }
        ],
        faq: [
            { q: 'Mesaj kullanıcılara nasıl ulaşır?', a: 'Yayın penceresi içindeyken hedef kullanıcılar uygulamayı her açtığında pop-up olarak gösterilir. E-posta gönderilmez; mesajlar yalnızca uygulama içidir.' },
            { q: '"Kapat" ile "Bir daha gösterme" arasındaki fark nedir?', a: '"Kapat" mesajı yalnızca o oturum için gizler; kullanıcı uygulamayı tekrar açtığında mesaj yine görünür. "Bir daha gösterme" ise sunucuda kaydedilir ve mesaj o kullanıcıya bir daha gösterilmez.' },
            { q: 'Mesajı sadece belirli kişilere gönderebilir miyim?', a: 'Evet. Hedef türünü seçili kişiler yapıp arama ile çalışanları ekleyin. Yalnızca seçtiğiniz kullanıcılar pop-up görür.' },
            { q: 'Yayınlanan mesajı geri çekebilir miyim?', a: 'Evet. Listeden mesajı pasife alın; pencere devam etse bile artık gösterilmez. Dilerseniz mesajı tamamen silebilirsiniz.' },
            { q: 'Zamanlanmış mesaj ne zaman görünmeye başlar?', a: 'Başlangıç tarih-saati geldiğinde otomatik olarak Aktif duruma geçer ve kullanıcıların sonraki uygulama açılışında gösterilir. Ayrıca elle bir işlem yapmanız gerekmez.' }
        ]
    },
{
        id: 'sistem-sagligi',
        title: 'Sistem Sağlığı',
        icon: Shield,
        description: 'Sistem Kontrol Merkezi: puantaj motoru doğrulama (TYR), veri bütünlüğü ve talep denetimi, PDKS araçları, test/bakım işlemleri ve tehlikeli bölge araçları. (Yalnızca sistem yöneticileri görebilir)',
        permission: 'PAGE_SYSTEM_HEALTH',
        link: '/admin/system-health',
        images: [
            { src: '/help-images/help-sistem-01.png', caption: 'Genel Bakış sekmesi — sistem ayarları, veri temizliği ve servis durumu' },
            { src: '/help-images/help-sistem-02.png', caption: 'TYR + Veri Bütünlüğü sekmesi — tam yeniden hesaplama önizlemesi ve değişen günler raporu' },
            { src: '/help-images/help-sistem-03.png', caption: 'Talep Denetimi sekmesi — kategori seçiciler, Dry-run Tara, Tümünü Onar ve TXT İndir' }
        ],
        steps: [
            {
                title: 'Sekme Düzeni',
                description: 'Sayfa "Sistem Kontrol Merkezi" başlığıyla açılır ve 21 sekmeye ayrılır. Ana paneller: Genel Bakış, TYR + Veri Bütünlüğü, Talep Denetimi, Gate Event Analizi. Uzman hub sekmeleri: Mesai Denetim, Fazla Mesai, RBAC & Yetki, Kişi-Gün Tanılama, Talep & İzin, Onarım & Recovery, Test & Doğrulama, Sistem & Bakım. Özel araçlar: Kalıntı Çalışanlar, PDKS Raw Import, PDKS Mutabakat, Takvim Temizliği, Stres Testi, Sentetik Veri, Sistem Sıfırlama, Potansiyel Denetimi, Yanlış İptal Kurtarma.',
                image: { src: '/help-images/help-sistem-01.png', caption: 'Genel Bakış — sistem ayarları ve servis durumu' }
            },
            {
                title: 'TYR + Veri Bütünlüğü ile Tam Yeniden Hesaplama',
                description: 'TYR (Tüm Yeniden Hesaplama) sekmesi puantaj motorunu seçilen kapsam için baştan çalıştırır. Akış üç aşamalıdır: önce dry-run önizleme koşulur, ardından değişen günler raporu incelenir (hangi çalışanın hangi günü nasıl değişecek), son olarak APPLY ile değişiklikler veritabanına yazılır. APPLY yapılmadan hiçbir kayıt değişmez.',
                image: { src: '/help-images/help-sistem-02.png', caption: 'TYR + Veri Bütünlüğü sekmesi' }
            },
            {
                title: 'Talep Denetimi ile Tarama',
                description: 'Talep Denetimi sekmesi dış görev, izin ve fazla mesai taleplerindeki veri bozukluklarını bulur. 10 kategori seçilebilir: Çok-günlü Görev Tek-Gün İşlenmiş, Dış Görev Kaydı Yok, Görev Fazla Mesaisi Takılı, Yarım-Gün Kesimini Aşan Görev Saati, Dış Görev Tutarlılığı, Sahipsiz Talep, İzin + Fazla Mesai Çakışması, İzin + Dış Görev Çakışması, Süre Uyuşmazlığı, Durum Anomalisi. Tarih aralığı ve isteğe bağlı Çalışan ID girip "Dry-run Tara" ile taramayı başlatın; sonuçlar önem derecesine (Yüksek/Orta/Düşük) göre kategori kartlarında listelenir.',
                image: { src: '/help-images/help-sistem-03.png', caption: 'Talep Denetimi — kategori seçiciler ve tarama sonuçları' }
            },
            {
                title: 'Talep Denetimi Onarımı ve TXT Raporu',
                description: 'Tarama sonrası her satırdaki "Onar" düğmesiyle tekli onarım, kategori kartındaki "Hepsini Onar" ile kategori bazlı, üstteki "Tümünü Onar" ile tüm otomatik düzeltilebilir sorunlar toplu onarılır. Her onarımdan sonra sistem otomatik yeniden tarar ve güncel durumu gösterir. "elle" rozetli kayıtlar otomatik onarılamaz, manuel inceleme gerektirir. "TXT İndir" ile tüm tarama sonucu metin raporu olarak bilgisayarınıza kaydedilir.'
            },
            {
                title: 'Genel Bakış ve Hub Sekmeleri',
                description: 'Genel Bakış sekmesinde sistem istatistikleri, sistem ayarları, veri temizliği ve servis durumu bulunur. Hub sekmeleri (Mesai Denetim, Fazla Mesai, RBAC & Yetki, Kişi-Gün Tanılama, Talep & İzin, Onarım & Recovery, Test & Doğrulama, Sistem & Bakım) alt sekmeli panellerdir; ilgili alandaki tanılama ve onarım araçlarını gruplar.'
            },
            {
                title: 'Test Araçları: Stres Testi ve Sentetik Veri',
                description: 'Stres Testi sekmesi puantaj motorunu 150+ senaryoyla (vardiya toleransları, otomatik mola kesintileri, gece vardiyası, otomatik mesai bölme) test eder; Üretim Hazırlık Testi tüm talep/onay/vekalet/bildirim akışlarını kapsamlı sınar. Sonuçlar canlı konsol ekranında izlenir. Sentetik Veri sekmesi test ortamı için geçmişe dönük rastgele giriş/çıkış ve izin verisi üretir.'
            },
            {
                title: 'Sistem Sıfırlama (Tehlikeli Bölge)',
                description: 'Sistem Sıfırlama sekmesi "Tehlikeli Bölge" olarak işaretlidir. "Tüm Personeli Sil" işlemi süper adminler hariç tüm çalışanları, kullanıcı hesaplarını, izin taleplerini ve puantaj kayıtlarını kalıcı siler. İki aşamalı onay ister: önce onay penceresi, ardından metin kutusuna büyük harflerle SIL yazmanız gerekir.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Sistem Sıfırlama ve Sentetik Veri (mevcut verileri sil seçeneğiyle) geri alınamaz veri kaybına yol açar. Canlı sistemde yalnızca ne yaptığınızdan kesinlikle emin olduğunuzda kullanın.' },
            { type: 'info', text: 'TYR ve Talep Denetimi güvenli tasarlanmıştır: önce dry-run çalışır, siz APPLY veya Onar demeden veritabanında hiçbir şey değişmez.' },
            { type: 'info', text: 'Uzun tarih aralığında denetim zaman aşımına düşebilir. Bu durumda daha kısa bir tarih aralığı seçin veya tek Çalışan ID ile daraltın.' },
            { type: 'success', text: 'Talep Denetimi sonuçlarını "TXT İndir" ile arşivleyin; rapor tarih aralığı, toplam sorun sayısı ve her kaydın oto/elle onarım durumunu içerir.' }
        ],
        faq: [
            { q: 'TYR nedir ve ne zaman çalıştırılmalı?', a: 'TYR (Tüm Yeniden Hesaplama) puantaj motorunu seçilen dönem için baştan koşturur ve mevcut kayıtlarla karşılaştırır. Toplu veri düzeltmeleri, takvim değişiklikleri veya şüpheli hesap farkları sonrası çalıştırılır. Önce dry-run raporunu inceleyin, sonra APPLY yapın.' },
            { q: 'Talep Denetimi hangi bozuklukları bulur?', a: 'Çok günlü dış görevin tek gün işlenmesi, onaylı göreve rağmen puantaj kaydının olmaması, görev fazla mesaisinin beklemede takılı kalması, izinle çakışan mesai/görev, süre uyuşmazlıkları ve durum anomalileri gibi 10 kategori taranır.' },
            { q: 'Dry-run tarama veriyi değiştirir mi?', a: 'Hayır. Dry-run yalnızca okur ve raporlar. Veri ancak siz tekli "Onar", "Hepsini Onar" veya "Tümünü Onar" düğmelerini onayladığınızda değişir.' },
            { q: '"elle" rozetli sorunlar neden onarılamıyor?', a: 'Bu kayıtlar otomatik düzeltme için güvenli değildir; birden fazla olası çözüm vardır veya insan kararı gerekir. Kişi-Gün Tanılama veya Veri Yönetimi sayfasından manuel inceleyin.' },
            { q: 'Sistem Sıfırlama yanlışlıkla tetiklenebilir mi?', a: 'Zor. İşlem iki aşamalı onay ister: önce uyarı penceresini onaylamanız, ardından metin kutusuna SIL yazmanız gerekir. Yine de bu sekmede gezinirken dikkatli olun.' },
            { q: 'Bu sayfaya kimler erişebilir?', a: 'Yalnızca PAGE_SYSTEM_HEALTH yetkisine sahip sistem yöneticileri. Araçların çoğu tüm şirket verisini etkileyebildiği için yetki dar tutulmalıdır.' }
        ]
    },
    {
        id: 'servis-yonetimi',
        title: 'Servis Yönetimi',
        icon: Server,
        description: 'Günlük toplu puantaj hesaplamasını manuel tetikleme, arka plan servis durumu ve canlı servis logları. (Yalnızca sistem yöneticileri görebilir)',
        permission: 'PAGE_SYSTEM_HEALTH',
        link: '/admin/service-control',
        images: [
            { src: '/help-images/help-servis-01.png', caption: 'Servis Yönetimi — günlük hesaplama tetikleme, sistem durumu ve canlı servis logları' }
        ],
        steps: [
            {
                title: 'Günlük Hesaplama Tetikleme',
                description: 'Hedef tarihi seçip "Servisi Çalıştır" düğmesine basın. Seçilen gün için tüm çalışanların giriş-çıkış, mola ve fazla mesai hesapları yeniden çalıştırılır. Elle veri düzeltmesi yaptıktan sonra kayıtları senkronize etmek için kullanılır.',
                image: { src: '/help-images/help-servis-01.png', caption: 'Günlük hesaplama tetikleme kartı' }
            },
            {
                title: 'Sistem Durumu Kartı',
                description: 'Sağdaki kart arka plan servislerinin durumunu özetler: canlı güncelleme her 30 saniyede, gece görevleri 00:01\'de otomatik çalışır. Alttaki hızlı bağlantılarla Sistem Kontrol Merkezi ve Canlı Durum Paneline geçebilirsiniz.'
            },
            {
                title: 'Canlı Servis Loglarını İzleme',
                description: 'Sayfanın altındaki konsol son 100 servis işlemini gösterir ve otomatik yenilenir. Her satırda saat, seviye (INFO mavi, WARN sarı, ERROR kırmızı), bileşen adı, mesaj ve varsa ilgili çalışan etiketi bulunur.'
            },
            {
                title: 'Servis Toleransının Etkisi',
                description: 'Servis kullanan (uses_service) çalışanlarda giriş/çıkış saatleri servis toleransı (varsayılan 15 dk) içinde vardiya sınırlarına yuvarlanır. Bu değer takvimden okunur ve gerekirse çalışan bazında geçersiz kılınabilir. Toplu hesaplama tetiklediğinizde bu yuvarlama otomatik uygulanır.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Toplu hesaplama çalışan sayısına bağlı olarak sürebilir ve işlem sırasında sistem yavaşlayabilir. Yoğun mesai saatleri dışında tetiklemeyi tercih edin.' },
            { type: 'info', text: 'Log konsolu boşsa Sistem Sağlığı > Sistem Ayarları bölümünden servis loglarını aktif edin.' },
            { type: 'info', text: 'Servis toleransı yalnızca servis kullanan çalışanları etkiler; diğer çalışanlar için normal tolerans (30 dk vardiya sonrası pencere) geçerlidir.' }
        ],
        faq: [
            { q: 'Günlük hesaplamayı ne zaman manuel tetiklemeliyim?', a: 'Veri Yönetiminden giriş/çıkış düzeltmesi yaptıktan sonra veya bir günün hesapları güncel görünmüyorsa. Normal akışta canlı güncelleme 30 saniyede bir, gece görevleri 00:01\'de otomatik çalışır.' },
            { q: 'Geçmiş bir tarih için hesaplama çalıştırabilir miyim?', a: 'Evet. Hedef tarih alanından istediğiniz günü seçebilirsiniz; varsayılan olarak dünkü tarih gelir.' },
            { q: 'Servis toleransı kimlere uygulanır?', a: 'Yalnızca servis kullanan çalışanlara. Giriş/çıkış saatleri vardiya sınırlarına yuvarlanır. Değer takvimden okunur, çalışan bazında farklı bir değer tanımlanabilir.' },
            { q: 'Loglarda ERROR görüyorum, ne yapmalıyım?', a: 'Hata satırındaki bileşen adı ve mesajı not edin. Kalıcı hatalar için Sistem Sağlığı sayfasındaki tanılama sekmelerini (Kişi-Gün Tanılama, TYR) kullanın.' }
        ]
    },
    {
        id: 'veri-yonetimi',
        title: 'Veri Yönetimi',
        icon: Database,
        description: 'Personel puantaj verilerini ay takvimi üzerinde görüntüleme ve düzenleme, toplu işlemler, geçmiş dönem kilidi, yıllık matris ve yedekleme. (Veri yönetimi yetkisine sahip yöneticiler ve sistem yöneticileri görebilir)',
        permission: 'PAGE_DATA_MANAGEMENT',
        link: '/system-data-management',
        images: [
            { src: '/help-images/help-veri-01.png', caption: 'Personel Verileri sekmesi — çalışan seçimi, ay takvimi ve gün rozetleri' },
            { src: '/help-images/help-veri-02.png', caption: 'Toplu İşlemler sekmesi — toplu giriş/çıkış, otomatik tamamlama, mutabakat ve dönem kilidi' },
            { src: '/help-images/help-veri-03.png', caption: 'Yedekleme sekmesi — JSON/CSV dışa aktarma ve geri yükleme' }
        ],
        steps: [
            {
                title: 'Personel Verileri: Çalışan ve Ay Seçimi',
                description: 'Personel Verileri sekmesinde çalışanı ve ayı seçin; ay takvimi açılır. Gün hücrelerinde durum rozetleri renk kodludur: RAPORLU (mor), ÖZEL izin (cyan), DIŞ GÖREV (turuncu), izin tipi rozetleri ve fazla mesai durumu. Böylece ayın tamamı tek bakışta okunur.',
                image: { src: '/help-images/help-veri-01.png', caption: 'Ay takvimi ve gün rozetleri' }
            },
            {
                title: 'Gün Düzenleme Paneli',
                description: 'Takvimde bir güne tıklayınca düzenleme paneli açılır. Panelde o güne ait mevcut kayıtların salt okunur listesi (sağlık raporları, özel izinler, dış görevler) ve giriş/çıkış saatlerini düzeltme alanları bulunur. Değişiklikler kaydedildiğinde puantaj yeniden hesaplanır.'
            },
            {
                title: 'Toplu İşlemler',
                description: 'Toplu İşlemler sekmesinde üç ana bölüm vardır: Toplu Giriş/Çıkış Oluşturma (seçilen çalışanlara tarih aralığında kayıt basar), Toplu Otomatik Tamamlama (eksik günleri doldurur) ve Toplu Bakiye Sıfırlama / Mutabakat (dönem bakiyelerini kapatır). Her işlem çalıştırılmadan önce onay penceresi gösterir.',
                image: { src: '/help-images/help-veri-02.png', caption: 'Toplu işlemler bölümleri' }
            },
            {
                title: 'Geçmiş Dönem Kilitleme',
                description: 'Toplu İşlemler sekmesindeki dönem kilidi bölümünden kapanmış bir mali dönemi (önceki ayın 26\'sı - ayın 25\'i) kilitleyebilir veya kilidini açabilirsiniz. Kilitli dönemde kullanıcılar talep oluşturamaz, yöneticiler onaylayamaz; kilitleme anında o döneme ait bekleyen talepler otomatik iptal edilir. Yalnızca bugünü geçmiş, kapanmış dönemler kilitlenebilir; seçilen dönemin kilit durumu rozetle gösterilir.'
            },
            {
                title: 'Yıllık Matris',
                description: 'Yıllık Matris sekmesi çalışanların yıl geneli görünümünü tablo halinde sunar. Bir hücreye tıklayarak ilgili çalışanın Personel Verileri takvimine doğrudan geçebilirsiniz.'
            },
            {
                title: 'Yedekleme: Dışa ve İçe Aktarma',
                description: 'Yedekleme sekmesinden sistem verisini JSON (tam yedek) veya CSV (Excel ile raporlama/analiz) formatında dışa aktarabilirsiniz. Geri yüklemede önce simülasyon (dry-run) çalıştırılıp sonuç önizlenir, ardından gerçek geri yükleme yapılır.',
                image: { src: '/help-images/help-veri-03.png', caption: 'Yedekleme sekmesi' }
            }
        ],
        tips: [
            { type: 'warning', text: 'Toplu işlemler ve yedek geri yükleme çok sayıda kaydı birden değiştirir. Onay pencerelerini dikkatle okuyun; geri yüklemede önce mutlaka simülasyon çalıştırın.' },
            { type: 'info', text: 'Dönem kilidi kullanıcı taleplerini durdurur ama TYR ve Veri Yönetimi kilitli döneme dokunabilir; resmi düzeltmeler bu kanallardan yapılır.' },
            { type: 'info', text: 'Mutabakatta isteğe bağlı artı/eksi "kalan devir" girilebilir; varsayılan 0 bakiyeyi tam sıfırlar, girilen değer sonraki aya devreder ve bordroya otomatik yansır.' },
            { type: 'success', text: 'Takvimdeki renk rozetleri sayesinde raporlu, özel izinli ve dış görevli günleri düzenlemeye girmeden ayırt edebilirsiniz.' }
        ],
        faq: [
            { q: 'Dönem kilidini kimler yönetebilir?', a: 'Sistem yöneticileri ve muhasebe yetkisine sahip kullanıcılar. Kilitleme/açma işlemi onay penceresiyle yapılır ve kilitlemede iptal edilen bekleyen talep sayısı bildirilir.' },
            { q: 'İçinde bulunduğumuz dönemi kilitleyebilir miyim?', a: 'Hayır. Yalnızca bitmiş (kapanmış) mali dönemler kilitlenebilir. Mali dönem önceki ayın 26\'sından ayın 25\'ine kadardır.' },
            { q: 'Kilitli dönemde bekleyen talepler ne olur?', a: 'Kilitleme anında o döneme ait bekleyen talepler otomatik iptal edilir; ilgili kullanıcılar bunu talep listelerinde görür.' },
            { q: 'Giriş/çıkış düzeltmesi puantajı otomatik günceller mi?', a: 'Evet, kayıt sonrası hesaplama yenilenir. Toplu düzeltmeler sonrası Servis Yönetiminden günlük hesaplamayı da tetikleyebilirsiniz.' },
            { q: 'JSON ve CSV yedek arasındaki fark nedir?', a: 'JSON tam veri yedeği ve geri yükleme içindir; CSV Excel ile raporlama ve analiz için uygundur. Geri yükleme yalnızca JSON yedekle yapılır.' }
        ]
    },
    {
        id: 'program-yonetimi',
        title: 'Program Yönetimi',
        icon: Package,
        description: 'Harici yazılım ve cihaz entegrasyonları: program kaydı, program anahtarı yönetimi, cihaz erişim takibi ve erişim logları. (Program yönetimi yetkisine sahip sistem yöneticileri görebilir)',
        permission: 'PAGE_PROGRAM_MANAGEMENT',
        link: '/program-management',
        images: [
            { src: '/help-images/help-programlar-01.png', caption: 'Program Yönetimi — program listesi, cihaz erişimleri ve erişim logları' }
        ],
        steps: [
            {
                title: 'Program Kaydı Oluşturma',
                description: 'Yeni program oluşturma penceresinden harici yazılımı sisteme kaydedin. Her programa bağlantı için kullanılacak özel bir program anahtarı üretilir. Soldaki listeden bir programa tıklayınca cihazları ve logları yüklenir.',
                image: { src: '/help-images/help-programlar-01.png', caption: 'Program listesi ve detay paneli' }
            },
            {
                title: 'Program Anahtarı Yönetimi',
                description: 'Program anahtarını göster/gizle ve panoya kopyala düğmeleriyle yönetebilirsiniz. "Anahtar Yenile" mevcut anahtarı geçersiz kılar ve yeni anahtar üretir; yenileme anında o anahtarı kullanan tüm bağlantılar kesilir, bu yüzden işlem onay ister.'
            },
            {
                title: 'Cihaz Takibi',
                description: 'Cihazlar sekmesi programa bağlanan cihazların erişim listesini gösterir. Her cihazı tek tıkla aktif/pasif duruma çevirebilirsiniz; pasif cihazın bağlantı denemeleri reddedilir.'
            },
            {
                title: 'Erişim Loglarını İnceleme',
                description: 'Erişim logları her bağlantı denemesini sonuç koduyla listeler: SUCCESS (başarılı), INVALID_KEY (geçersiz anahtar), INVALID_CREDENTIALS, PROGRAM_INACTIVE (program pasif), VERSION_REJECTED (sürüm reddi), HWID_BLOCKED (cihaz engelli), HWID_LIMIT (cihaz limiti aşıldı), USER_INACTIVE. Renk kodları sorunu hızla ayırt etmenizi sağlar.'
            },
            {
                title: 'Kullanıcılar ve Dokümantasyon',
                description: 'Kullanıcılar sekmesinden programa erişecek kullanıcıları yönetebilir, Dokümantasyon sekmesinden entegrasyon bilgilerine ulaşabilirsiniz. Üstteki gösterge paneli programların genel istatistiklerini özetler.'
            },
            {
                title: 'Program Silme',
                description: 'Program silindiğinde ona ait tüm erişim kayıtları da birlikte silinir. İşlem onay penceresiyle doğrulanır ve geri alınamaz.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Anahtar yenileme o programı kullanan tüm cihazların bağlantısını anında keser. Yenilemeden önce yeni anahtarı cihazlara dağıtma planınızı hazırlayın.' },
            { type: 'warning', text: 'Program silme geri alınamaz ve tüm erişim/log kayıtlarını da kaldırır. Geçici devre dışı bırakmak için silmek yerine programı pasif yapın.' },
            { type: 'info', text: 'Bir cihaz bağlanamıyorsa önce erişim loglarındaki sonuç koduna bakın; kod sorunun kaynağını (anahtar, sürüm, cihaz limiti, pasiflik) doğrudan söyler.' }
        ],
        faq: [
            { q: 'Cihaz neden bağlanamıyor?', a: 'Erişim loglarında son denemenin sonuç koduna bakın: INVALID_KEY anahtar hatası, VERSION_REJECTED eski sürüm, HWID_BLOCKED engellenen cihaz, HWID_LIMIT cihaz limiti, PROGRAM_INACTIVE pasif program anlamına gelir.' },
            { q: 'Program anahtarı sızdıysa ne yapmalıyım?', a: 'Hemen "Anahtar Yenile" ile eski anahtarı geçersiz kılın. Tüm mevcut bağlantılar kesilir; yeni anahtarı yalnızca güvenilir cihazlara dağıtın.' },
            { q: 'Bir cihazı kalıcı silmeden engelleyebilir miyim?', a: 'Evet. Cihazlar listesinden ilgili cihazı pasif duruma çevirin; bağlantı denemeleri HWID_BLOCKED/pasif olarak reddedilir ve loglarda görünür.' },
            { q: 'HWID_LIMIT ne demek?', a: 'Programa tanımlı cihaz sayısı limitine ulaşılmış demektir. Kullanılmayan cihazları pasifleştirerek veya limiti güncelleyerek yer açabilirsiniz.' }
        ]
    },
    {
        id: 'tedarik-talepleri',
        title: 'Tedarik Talepleri',
        icon: ShoppingCart,
        description: 'Satın alma/tedarik talebi oluşturma, kalem bazlı içerik, öncelik seçimi, onay süreci ve durum takibi. (Tedarik yetkisi verilen kullanıcılar görebilir; Tüm Talepler sekmesi ve onay/red işlemleri sistem yöneticilerindedir)',
        permission: 'PAGE_PROCUREMENT',
        link: '/procurement',
        images: [
            { src: '/help-images/help-tedarik-01.png', caption: 'Tedarik Talepleri — özet kartlar, talep listesi ve yeni talep oluşturma' }
        ],
        steps: [
            {
                title: 'Yeni Talep Oluşturma',
                description: '"Yeni Talep" düğmesiyle formu açın. Başlık girin, öncelik seçin (Normal, Acil, Çok Acil) ve en az 1 kalem ekleyin. Form gönderilince talep "Onay Bekliyor" durumuyla oluşur.',
                image: { src: '/help-images/help-tedarik-01.png', caption: 'Talep listesi ve yeni talep düğmesi' }
            },
            {
                title: 'Kalem Ekleme',
                description: 'Her kalem için kategori (Ofis & Kırtasiye, Bilgi Teknolojileri, Yazılım & Lisans, Ölçüm & Harita Ekipmanı, Baskı & Çoğaltma, İş Güvenliği/KKD, Mobilya, Mutfak & Temizlik, Teknik Yayın, Diğer), ürün adı, miktar ve birim (Adet, Kg, Kutu, Paket, Litre, Takım, Metre, Rulo) girilir. Tahmini maliyet ve not alanları isteğe bağlıdır.'
            },
            {
                title: 'Durum Takibi',
                description: 'Talepler dört durumda izlenir: Onay Bekliyor (mavi), Onaylandı (yeşil), Reddedildi (kırmızı), İptal Edildi. Üstteki özet kartlar toplam, bekleyen, onaylanan ve reddedilen sayılarını gösterir.'
            },
            {
                title: 'Filtreleme ve Detay',
                description: 'Liste durum ve öncelik filtreleriyle daraltılabilir, tarihe göre sıralanır. Detay penceresinde kalem listesi, toplam tahmini maliyet, onaylayan kişi ve reddedildiyse red gerekçesi görünür.'
            },
            {
                title: 'Bekleyen Talebi İptal Etme veya Silme',
                description: 'Yalnızca kendi "Onay Bekliyor" durumundaki taleplerinizi iptal edebilir veya kalıcı silebilirsiniz. Her iki işlem de onay penceresiyle doğrulanır.'
            },
            {
                title: 'Onay ve Red (Yönetici)',
                description: 'Sistem yöneticileri "Tüm Talepler" sekmesini görür ve bekleyen talepleri onaylayabilir veya reddedebilir. Red işleminde gerekçe girilmesi zorunludur; gerekçe talep sahibinin detay ekranında görünür.'
            }
        ],
        tips: [
            { type: 'info', text: 'Tahmini maliyet girmek zorunlu değildir; girilen kalemlerden toplam tahmini maliyet otomatik hesaplanıp listede gösterilir.' },
            { type: 'warning', text: 'Onaylanmış veya reddedilmiş talepler kullanıcı tarafından iptal edilemez ve silinemez; yalnızca bekleyen talepleriniz üzerinde işlem yapabilirsiniz.' },
            { type: 'success', text: 'Acil ihtiyaçlarda önceliği "Acil" veya "Çok Acil" seçin; öncelik listede renkli etiketle görünür ve filtrelenebilir.' }
        ],
        faq: [
            { q: 'Talebimi kim onaylıyor?', a: 'Sistem yöneticileri (tam erişim yetkisine sahip kullanıcılar) "Tüm Talepler" sekmesinden bekleyen talepleri onaylar veya reddeder.' },
            { q: 'Onaylanmış talebimi iptal edebilir miyim?', a: 'Hayır. İptal ve silme yalnızca kendi "Onay Bekliyor" durumundaki talepleriniz için mümkündür. Onaylanmış bir talep için sistem yöneticisine başvurun.' },
            { q: 'Bir talepte kaç kalem olabilir?', a: 'En az 1 kalem zorunludur; ihtiyaç kadar kalem ekleyebilirsiniz. Her kalemin kategorisi, adı, miktarı ve birimi ayrı girilir.' },
            { q: 'Talebim reddedildi, gerekçeyi nerede görürüm?', a: 'Talebin detay penceresinde red gerekçesi kırmızı kutuda gösterilir. Gerekçeye göre düzeltip yeni talep oluşturabilirsiniz.' },
            { q: 'Toplam maliyet nasıl hesaplanıyor?', a: 'Kalemlere girdiğiniz tahmini maliyetlerin toplamıdır ve listede "Tahmini Maliyet" sütununda TL olarak gösterilir. Maliyet girilmeyen kalemler toplama katılmaz.' }
        ]
    },
    {
        id: 'debug',
        title: 'Debug',
        icon: Bug,
        description: 'Puantaj Hata Ayıklayıcı: veritabanı kayıtları ile canlı hesaplamayı karşılaştırarak hatalı veya eksik değerleri teşhis eden salt okunur teknik araç. (Yalnızca debug yetkisine sahip teknik yöneticiler görebilir)',
        permission: 'PAGE_DEBUG',
        link: '/debug/attendance',
        images: [
            { src: '/help-images/help-debug-01.png', caption: 'Puantaj Hata Ayıklayıcı — çalışan/dönem seçimi, veritabanı özeti ve canlı hesaplama karşılaştırması' }
        ],
        steps: [
            {
                title: 'Çalışan ve Dönem Seçimi',
                description: 'Listeden çalışanı seçin, ay ve yılı girin. Varsayılan dönem mali dönem mantığına göre gelir: ayın 26\'sından sonra bir sonraki ay otomatik seçilir (mali dönem önceki ayın 26\'sı - ayın 25\'i).',
                image: { src: '/help-images/help-debug-01.png', caption: 'Kontrol paneli — çalışan ve dönem seçimi' }
            },
            {
                title: 'Analizi Çalıştırma',
                description: '"Kayıtları Analiz Et" düğmesine basın. Sistem seçilen çalışanın dönem verisini hem veritabanından okur hem de canlı olarak yeniden hesaplar ve iki sonucu yan yana sunar.'
            },
            {
                title: 'Veritabanı Özetini Okuma',
                description: 'Veritabanı Özeti kartı kayıtlı aylık özetin hedef, tamamlanan, eksik ve toplam mola değerlerini son güncelleme zamanıyla gösterir. Aylık özet kaydı hiç yoksa kırmızı "Veritabanında Aylık Özet Bulunamadı" uyarısı çıkar.'
            },
            {
                title: 'Canlı Hesaplama Karşılaştırması',
                description: 'Canlı Hesaplama kartı dönem hedefini anlık hesaplar. DB hedefi ile canlı hedef farklıysa kayıtlar bayattır ve yeniden hesaplama gerekir. Yapılandırma kartında çalışma takvimi, dönem aralığı ve dönemdeki izin sayısı görünür.'
            },
            {
                title: 'Ham Kayıtlar ve JSON Çıktısı',
                description: 'Ham Günlük Kayıtlar tablosu her günün toplam, normal, fazla mesai, eksik ve mola değerlerini saniye cinsinden listeler. En altta API\'nin ham JSON yanıtı yer alır; NaN veya tutarsız değerin hangi alandan geldiğini burada saptayabilirsiniz.'
            }
        ],
        tips: [
            { type: 'info', text: 'Bu araç salt okunurdur: analiz hiçbir kaydı değiştirmez, yalnızca teşhis içindir.' },
            { type: 'info', text: 'DB hedefi ile canlı hedef farklıysa Servis Yönetiminden ilgili gün için günlük hesaplama tetikleyin veya Sistem Sağlığından TYR çalıştırın; ardından analizi tekrarlayın.' },
            { type: 'warning', text: 'Ham JSON çıktısı çalışanın detaylı puantaj verisini içerir. Ekran görüntüsü paylaşırken kişisel veri gizliliğine dikkat edin.' }
        ],
        faq: [
            { q: '"Veritabanında Aylık Özet Bulunamadı" ne anlama gelir?', a: 'Seçilen dönem için MonthlyWorkSummary kaydı hiç oluşmamış demektir. Genellikle dönem için hesaplama hiç koşulmamıştır; günlük hesaplama veya TYR sonrası özet oluşur.' },
            { q: 'DB hedefi ile canlı hedef neden farklı çıkar?', a: 'Takvim, vardiya veya izin verisi değiştikten sonra kayıtlı özet güncellenmemiş olabilir. Fark görürseniz yeniden hesaplama çalıştırın; iki değer eşitlenmelidir.' },
            { q: 'Tablodaki değerler neden saniye cinsinden?', a: 'Ham kayıtlar motorun sakladığı ham saniye değerleridir; yuvarlama kaynaklı farkları görebilmek için dönüştürülmeden gösterilir. Üst kartlardaki değerler ise saat:dakika biçimindedir.' },
            { q: 'Bu araçla veri düzeltebilir miyim?', a: 'Hayır. Debug sayfası yalnızca teşhis yapar. Düzeltme için Veri Yönetimi (giriş/çıkış düzeltme), Servis Yönetimi (günlük hesaplama) veya Sistem Sağlığı (TYR, Talep Denetimi) kullanılır.' }
        ]
    }
];

export default helpContent;
