const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Expo SQLite's web implementation loads its bundled wa-sqlite WebAssembly
// module through Metro. Android/iOS use the native SQLite implementation.
config.resolver.assetExts.push('wasm');

module.exports = withNativeWind(config, { input: './global.css' });
