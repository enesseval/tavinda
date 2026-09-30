const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// inlineRem 16 keeps Tailwind's spacing on the design's 4 pt grid (px-5 = 20).
module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
