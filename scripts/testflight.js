// One command from code to TestFlight (macOS + Xcode):
//   npm run ios:testflight
// Generates ios/, archives with automatic signing and uploads to App Store Connect.
// Needs APPLE_TEAM_ID in .env and an Apple account signed in under Xcode › Settings › Accounts.
// The build number comes from the clock (yymmdd.HHMM), so every run is higher than the last
// and app.config.ts is never edited locally (git pull stays clean).
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function readEnvFile() {
  const file = path.join(root, '.env');
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

const env = { ...readEnvFile(), ...process.env };
const team = env.APPLE_TEAM_ID;
if (!team) {
  console.error('APPLE_TEAM_ID yok. .env dosyasına ekle: APPLE_TEAM_ID=XXXXXXXXXX');
  process.exit(1);
}

const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const build =
  env.IOS_BUILD_NUMBER ||
  `${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}.${pad(now.getHours())}${pad(now.getMinutes())}`;
const runEnv = { ...env, IOS_BUILD_NUMBER: build };

const run = (cmd, args, opts = {}) => {
  console.log(`\n› ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { stdio: 'inherit', cwd: root, env: runEnv, ...opts });
};

console.log(`Build numarası: ${build}`);
run('npx', ['expo', 'prebuild', '-p', 'ios', '--clean']);
run('node', ['scripts/check-ios-modules.js']);

const iosDir = path.join(root, 'ios');
const ws = fs.readdirSync(iosDir).find((f) => f.endsWith('.xcworkspace'));
if (!ws) {
  console.error('.xcworkspace bulunamadı; prebuild pod install adımında takılmış olabilir.');
  process.exit(1);
}
const scheme = ws.replace(/\.xcworkspace$/, '');
const out = path.join(root, 'build');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const archive = path.join(out, `${scheme}.xcarchive`);

run('xcodebuild', [
  '-workspace',
  path.join(iosDir, ws),
  '-scheme',
  scheme,
  '-configuration',
  'Release',
  '-destination',
  'generic/platform=iOS',
  '-archivePath',
  archive,
  '-allowProvisioningUpdates',
  `DEVELOPMENT_TEAM=${team}`,
  'CODE_SIGN_STYLE=Automatic',
  'archive',
]);

const options = path.join(out, 'ExportOptions.plist');
fs.writeFileSync(
  options,
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>teamID</key><string>${team}</string>
  <key>signingStyle</key><string>automatic</string>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict>
</plist>
`,
);

run('xcodebuild', [
  '-exportArchive',
  '-archivePath',
  archive,
  '-exportOptionsPlist',
  options,
  '-exportPath',
  path.join(out, 'export'),
  '-allowProvisioningUpdates',
]);

console.log(`\nYüklendi: ${build}. App Store Connect işledikten sonra (10–30 dk) TestFlight'ta görünür.`);
