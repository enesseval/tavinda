// Opens the generated Xcode workspace (run `npm run ios:prebuild` first).
// Some pods copy files into node_modules during `pod install` (expo-sqlite's sqlite3.h), so after
// `npm ci` an old ios/ folder no longer builds ("Cannot find 'exsqlite3_open' in scope").
// When that happens, pods are installed again before Xcode opens.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const iosDir = path.join(root, 'ios');
if (!fs.existsSync(iosDir)) {
  console.error('ios/ yok. Önce: npm run ios:prebuild');
  process.exit(1);
}

const sqliteHeader = path.join(root, 'node_modules', 'expo-sqlite', 'ios', 'sqlite3.h');
const podsDir = path.join(iosDir, 'Pods');
if (!fs.existsSync(podsDir) || !fs.existsSync(sqliteHeader)) {
  console.log('node_modules yenilenmiş; pod install çalışıyor (expo-sqlite dosyalarını geri koyar)…');
  try {
    execFileSync('pod', ['install'], {
      cwd: iosDir,
      stdio: 'inherit',
      env: { ...process.env, LANG: process.env.LANG || 'en_US.UTF-8' },
    });
  } catch {
    console.error('pod install başarısız. Temiz kurulum: npm run ios:prebuild');
    process.exit(1);
  }
}

const ws = fs.readdirSync(iosDir).find((f) => f.endsWith('.xcworkspace'));
if (!ws) {
  console.error('.xcworkspace bulunamadı. `npm run ios:prebuild` çalıştır.');
  process.exit(1);
}
execFileSync('open', [path.join(iosDir, ws)], { stdio: 'inherit' });
