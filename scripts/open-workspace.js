// Opens the generated Xcode workspace (run `npm run ios:prebuild` first).
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const iosDir = path.join(__dirname, '..', 'ios');
if (!fs.existsSync(iosDir)) {
  console.error('ios/ yok. Önce: npm run ios:prebuild');
  process.exit(1);
}
const ws = fs.readdirSync(iosDir).find((f) => f.endsWith('.xcworkspace'));
if (!ws) {
  console.error('.xcworkspace bulunamadı. `npx pod-install` ya da `npm run ios:prebuild` çalıştır.');
  process.exit(1);
}
execFileSync('open', [path.join(iosDir, ws)], { stdio: 'inherit' });
