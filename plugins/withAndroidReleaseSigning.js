const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Signs release builds with the Play upload key when its environment variables are set
 * (CI, see .github/workflows/android.yml). Without them release falls back to the debug
 * key, which is fine for local runs but rejected by Google Play.
 */
const MARKER = '// tavinda-release-signing';

const SIGNING = `
        release {
            ${MARKER}
            if (System.getenv('ANDROID_UPLOAD_STORE_FILE')) {
                storeFile file(System.getenv('ANDROID_UPLOAD_STORE_FILE'))
                storePassword System.getenv('ANDROID_UPLOAD_STORE_PASSWORD')
                keyAlias System.getenv('ANDROID_UPLOAD_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_UPLOAD_KEY_PASSWORD')
            }
        }`;

function apply(gradle) {
  if (gradle.includes(MARKER)) return gradle;
  const debugBlock = /signingConfigs \{\n(\s*)debug \{[\s\S]*?\n\1\}/;
  if (!debugBlock.test(gradle)) throw new Error('withAndroidReleaseSigning: signingConfigs.debug not found');
  gradle = gradle.replace(debugBlock, (m) => m + SIGNING);
  const releaseUse = /(release \{\n(?:\s*\/\/.*\n)*\s*)signingConfig signingConfigs\.debug/;
  if (!releaseUse.test(gradle)) throw new Error('withAndroidReleaseSigning: release signingConfig not found');
  return gradle.replace(
    releaseUse,
    "$1signingConfig System.getenv('ANDROID_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
  );
}

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (c) => {
    c.modResults.contents = apply(c.modResults.contents);
    return c;
  });
};
module.exports.apply = apply;
