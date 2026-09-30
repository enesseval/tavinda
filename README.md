# Tavında — v0

"Demir tavında dövülür." Ders programını takvimden okuyan, işleri teslim tarihine göre günlere dağıtan ve iş yaklaştıkça ısınan öğrenci planlayıcısı. v0 tamamen yereldir: sunucu, hesap, ödeme ve ağ çağrısı yok.

Stack: Expo SDK 57 · TypeScript strict · expo-router · NativeWind · expo-sqlite · Reanimated · FlashList · date-fns (tr).

## Hızlı başlangıç (Expo Go)

Expo Go yalnızca Expo CLI'ın imzaladığı projeleri açar. İmza için bir Expo hesabı ve proje kimliği gerekir (sadece kimlik; EAS Build/Update kullanılmaz). Bir kerelik kurulum:

1. https://expo.dev üzerinde ücretsiz hesap aç (varsa atla).
2. Terminalde: `npx expo login`
3. iPhone'da Expo Go › Profil › aynı hesapla giriş yap.
4. Proje kimliği al: `npx eas-cli@latest init --non-interactive --force` (ya da expo.dev › Projects › Create project, slug: `tavinda`) ve çıkan kimliği `.env`'e yaz:
   ```bash
   cp .env.example .env
   # EXPO_OWNER=<expo kullanıcı adın>
   # EXPO_PROJECT_ID=<proje kimliği>
   ```

Sonra:

```bash
npm install
npx expo start
```

QR'ı iPhone kamerasıyla okut. Geliştirici menüsündeki "Demo dönem yükle" ile anında dolu bir dönem görebilirsin.

Alternatif (hesapsız): Mac'te Xcode varsa `npx expo run:ios --device` uygulamayı geliştirme build'i olarak doğrudan telefona kurar; Expo Go gerekmez.

## Kontroller

```bash
npx tsc --noEmit        # tip kontrolü (typed routes dahil)
npx jest                # domain + migration + tüm ekranların duman testi
npx expo-doctor         # bağımlılık / config
npx expo export -p ios  # üretim bundle'ı
```

## Xcode ile TestFlight

Önkoşul: Mac, Xcode, CocoaPods, App Store Connect'te bu bundle id ile açılmış bir uygulama kaydı.

1. `.env` dosyasına (bkz. `.env.example`; git'e girmez, Expo CLI otomatik okur) ekle:
   ```bash
   IOS_BUNDLE_ID=com.<senin-onekin>.tavinda
   APPLE_TEAM_ID=<10 haneli Team ID>
   ```
   Ya da `app.config.ts` içindeki `com.REPLACE.tavinda` değerini doğrudan değiştir.
2. `npm run ios:release` — build numarasını artırır (`app.config.ts` → `BUILD_NUMBER`) ve `ios/` klasörünü sıfırdan üretir (pod install dahil).
3. `npm run ios:open` — `.xcworkspace`'i Xcode'da açar.
4. Xcode: Signing & Capabilities → "Automatically manage signing" açık, Team seçili.
5. Üstte hedef olarak **Any iOS Device (arm64)** seç.
6. **Product › Archive**.
7. Organizer açılınca **Distribute App › App Store Connect › Upload**.
8. App Store Connect › TestFlight: build işlendikten sonra (5–15 dk) şifreleme sorusu çıkmaz (`ITSAppUsesNonExemptEncryption = false`); build'i **Internal Testing** grubuna ekle.

Her yeni yükleme için 2. adımdan tekrar başla; build numarası otomatik artar.

## Yapı

```
src/domain   saf kurallar (gün sınırı, pencere, ısı, erteleme, reconcile, widget snapshot) — React/Expo yok
src/db       SQLite: numaralı migration'lar (PRAGMA user_version), repository, demo seed
src/services eylemler, saat (zaman yolculuğu), bildirimler, takvim okuma
src/theme    tokens.ts (tüm tasarım token'ları), tema sağlayıcı
src/i18n     tr.ts (tüm metinler), tarih biçimleri
src/app      expo-router ekranları
```

Kurallar: şema değişikliği = yeni migration dosyası (uygulanmış olanı düzenleme). Gün hesabı yalnızca `LocalDate` ('YYYY-MM-DD') ve cut-off ile yapılır; UTC / `toISOString()` kullanılmaz.
