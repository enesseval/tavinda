# Google Play: kapalı test

Paket adı: **`com.tavinda.app`** (Play'de bir kez seçilir, sonradan değişmez).

## 1. İmzalı paket (.aab)

Android paketi GitHub Actions'ta derlenir (`.github/workflows/android.yml`). Mac'te Android Studio gerekmez.

1. **Upload key'i GitHub'a ekle** (bir kez): repo › Settings › Secrets and variables › Actions › *New repository secret*

   | Secret | Değer |
   | --- | --- |
   | `ANDROID_UPLOAD_KEYSTORE_BASE64` | `keystore-base64.txt` dosyasının tamamı |
   | `ANDROID_UPLOAD_STORE_PASSWORD` | `password.txt` |
   | `ANDROID_UPLOAD_KEY_PASSWORD` | `password.txt` (aynı) |
   | `ANDROID_UPLOAD_KEY_ALIAS` | `tavinda-upload` |

   `tavinda-upload.jks` ve şifreyi güvenli bir yerde sakla (parola yöneticisi). Kaybedersen Play Console'dan upload key sıfırlama istenebilir, ama uğraştırır. Repoya **koyma**: repo herkese açık.

2. **Derle:** Actions › *Android bundle* › *Run workflow*. Yaklaşık 15–25 dakika sürer.
3. **İndir:** çalışmanın sayfasındaki *Artifacts* bölümünde `tavinda-aab-<numara>` (zip içinde `app-release.aab`).
   - `debug-signed-not-for-play` adlı artifact, secret'ların eksik olduğu anlamına gelir. Play bu paketi kabul etmez.
4. `versionCode`, çalışma numarasıdır ve her çalıştırmada artar. Play aynı numarayı ikinci kez kabul etmez.

## 2. Play Console › Uygulama oluştur

- **Uygulama adı:** Tavında
- **Varsayılan dil:** Türkçe – tr-TR
- **Uygulama mı, oyun mu:** Uygulama
- **Ücretsiz mi, ücretli mi:** Ücretsiz
- Beyanları işaretle › *Uygulama oluştur*.

## 3. Kontrol paneli › Uygulamanızı ayarlayın

| Bölüm | Cevap |
| --- | --- |
| **Gizlilik politikası** | `https://github.com/enesseval/tavinda/blob/claude/cool-johnson-itf1wl/docs/PRIVACY.md` |
| **Uygulama erişimi** | Tüm işlevler özel erişim gerektirmeden kullanılabilir |
| **Reklamlar** | Hayır, uygulamam reklam içermiyor |
| **İçerik derecelendirmesi** | Kategori: *Diğer tüm uygulama türleri*. Tüm sorulara **Hayır** (şiddet, cinsellik, küfür, madde, kumar, kullanıcı etkileşimi/paylaşımı, konum paylaşımı, dijital satın alma). Beklenen sonuç: 3+ / Herkes. |
| **Hedef kitle** | **18 ve üzeri** (lise öğrencilerini de hedefleyeceksen 16–17'yi ekle; 13 yaş altını seçme, Aile politikası devreye girer). *Uygulama çocukların ilgisini çekebilir mi?* Hayır |
| **Haber uygulaması** | Hayır |
| **Veri güvenliği** | *Uygulamanız, zorunlu kullanıcı verisi türlerinden herhangi birini topluyor veya paylaşıyor mu?* **Hayır**. Tüm veriler cihazda kalır; sunucu yok. |
| **Devlet uygulaması** | Hayır |
| **Finansal özellikler** | Hiçbiri |
| **Sağlık** | Sağlık özelliği yok |

## 4. Mağaza girişi (Büyüme › Mağaza varlığı › Ana mağaza girişi)

**Kısa açıklama** (80 karakter):

> Ödevlerini ısısına göre sırala, her gün ne kadar çalışacağını bil.

**Tam açıklama:**

> Tavında, dersleri ve ödevleri tek bir yerde toplayan, sade bir öğrenci planlayıcısıdır.
>
> Her görevin bir ısısı var: Serin, Ilık, Sıcak, Kızgın, Son gün. Teslim yaklaştıkça ısı artar; böylece neye önce başlaman gerektiğini düşünmene gerek kalmaz.
>
> • Ders programını takviminden al ya da elle gir; bir derse birden çok gün ve saat ekle.
> • Haftalık ödevler dersin olduğu günden itibaren bir hafta boyunca ısınır.
> • Son teslim tarihli işler için geri sayım ve hatırlatma.
> • Bugün ekranı, her işten bugün ne kadar yapman gerektiğini söyler.
> • Ders arasındaki boşlukları zaman bloklarıyla değerlendir.
> • Gecikmiş işler kaybolmaz; bir hafta boyunca seni bekler.
> • Haftalık ve aylık takvim, açık ve koyu tema.
> • Verilerini dosya olarak dışa aktar, yeni telefonda içe aktar.
>
> Hesap yok, reklam yok, veri toplama yok. Her şey telefonunda kalır.

- **Uygulama simgesi (512×512):** `store/android/icon-512.png`
- **Öne çıkan grafik (1024×500):** `store/android/feature-graphic.png`
- **Telefon ekran görüntüleri (2–8 adet):** iPhone ekran görüntülerini Play oranına çevirmek için Mac'te
  `sh scripts/play-screenshots.sh ~/Desktop/*.png` çalıştır. Çıktı `store/android/screenshots/` klasörüne yazılır.
  Önerilen ekranlar: Bugün, Takvim (hafta), Görev detayı, Görevler.
- **Kategori:** Verimlilik. **Etiketler:** Planlayıcı, Eğitim.
- **İletişim e-postası:** geliştirici hesabındaki adres.

## 5. Kapalı test

1. **Test et ve yayınla › Test › Kapalı test**. Varsayılan kanal *Closed testing – Alpha*'dır; onu aç, sonra **Kanalı yönet**.
2. **Test kullanıcıları:** *E-posta listesi oluştur*. Liste adı "Tavında test"; adresleri **sen** gir, sonra kaydet.
   - *Geri bildirim URL'si / e-posta:* kendi adresin.
3. **Ülkeler/bölgeler:** Türkiye (ve testçilerin bulunduğu diğer ülkeler).
4. **Yeni sürüm oluştur:**
   - *Play Uygulama İmzalama:* **Google tarafından oluşturulan anahtarı kullan** (varsayılan). Bizim anahtar yalnızca *upload key* olur.
   - `app-release.aab` dosyasını yükle.
   - Sürüm adı otomatik dolar (`0.1.0`).
   - Sürüm notları:
     ```
     <tr-TR>
     İlk kapalı test sürümü. Ders programını gir, ödevlerini ekle ve Bugün ekranını dene. Bulduğun hataları bize yaz.
     </tr-TR>
     ```
   - *İleri* › uyarıları oku (hata yoksa devam) › *Kaydet*.
5. **Yayınlama özeti › Değişiklikleri incelemeye gönder.** İlk inceleme birkaç saat ile birkaç gün arasında sürer.
6. Onaydan sonra **Test kullanıcıları** sekmesindeki *katılım bağlantısını* testçilere gönder. Her testçi bağlantıyı açıp *Test kullanıcısı ol* demeli, sonra Play Store'dan indirmeli.

> **Yeni kişisel geliştirici hesabı:** Üretime (herkese açık yayın) başvurmak için en az **12 testçinin 14 gün boyunca** kesintisiz katılımda kalması gerekir. Kapalı test bunun için de sayılır.

## Android'de farklar

- Widget ve Live Activity yalnızca iPhone'da var. Android'de bu kodlar hiçbir şey yapmaz.
- Saat ve tarih seçimi Android'in kendi penceresiyle açılır.
- Takvim izni okuma ve yazma birlikte istenir (expo-calendar böyle çalışıyor). Uygulama takvime bir şey yazmaz.
