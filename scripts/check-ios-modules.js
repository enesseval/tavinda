// Verifies that every Expo native module the JS bundle needs is really linked into ios/.
// A stale ios/ or node_modules produces "Cannot find native module 'X'" only at launch
// on the phone; this catches it before Archive.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const iosDir = path.join(root, 'ios');

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  console.error('Temiz kurulum: rm -rf node_modules ios && npm ci && npm run ios:prebuild');
  process.exit(1);
}

if (!fs.existsSync(iosDir)) fail('ios/ yok.');
const lockPath = path.join(iosDir, 'Podfile.lock');
if (!fs.existsSync(lockPath)) fail('ios/Podfile.lock yok: pod install çalışmamış.');
const lock = fs.readFileSync(lockPath, 'utf8');

const resolved = JSON.parse(
  execFileSync(
    process.execPath,
    [
      '--no-warnings',
      '--eval',
      "require('expo/bin/autolinking')",
      'expo-modules-autolinking',
      'resolve',
      '--platform',
      'apple',
      '--json',
    ],
    { cwd: root, encoding: 'utf8' },
  ),
);

function findProviders(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) findProviders(p, out);
    else if (e.name === 'ExpoModulesProvider.swift') out.push(p);
  }
  return out;
}
const providers = findProviders(path.join(iosDir, 'Pods', 'Target Support Files'));
const provider = providers.map((p) => fs.readFileSync(p, 'utf8')).join('\n');

const missing = [];
for (const m of resolved.modules) {
  for (const pod of m.pods ?? []) {
    if (!lock.includes(`  - ${pod.podName} (`)) missing.push(`${m.packageName}: pod ${pod.podName} Podfile.lock içinde yok`);
  }
  if (provider) {
    for (const mod of m.modules ?? []) {
      const name = typeof mod === 'string' ? mod : mod.name;
      if (name && !provider.includes(name)) missing.push(`${m.packageName}: ${name} ExpoModulesProvider.swift içinde yok`);
    }
  }
}

if (missing.length) fail(`Bağlanmamış native modüller:\n  ${missing.join('\n  ')}`);
console.log(`✓ ${resolved.modules.length} Expo native modülü ios/ içinde bağlı${provider ? '' : ' (Podfile.lock)'}.`);
