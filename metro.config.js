// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);

  // Tillad import af .wasm-filer som assets (på web for expo-sqlite)
  config.resolver.assetExts = config.resolver.assetExts || [];
  if (!config.resolver.assetExts.includes('wasm')) {
    config.resolver.assetExts.push('wasm');
  }

  return config;
})();
