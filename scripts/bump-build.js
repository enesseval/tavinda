// Increments ios.buildNumber (and Android versionCode) in app.config.ts.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'app.config.ts');
const src = fs.readFileSync(file, 'utf8');
const re = /const BUILD_NUMBER = '(\d+)';/;
const m = src.match(re);
if (!m) {
  console.error('BUILD_NUMBER not found in app.config.ts');
  process.exit(1);
}
const next = String(Number(m[1]) + 1);
fs.writeFileSync(file, src.replace(re, `const BUILD_NUMBER = '${next}';`));
console.log(`ios.buildNumber: ${m[1]} → ${next}`);
