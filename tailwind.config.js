/**
 * NativeWind handles layout utilities only (flex, gap, padding, radius).
 * Colors, type and heat live in src/theme/tokens.ts and switch with the theme at runtime.
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: {} },
  plugins: [],
};
