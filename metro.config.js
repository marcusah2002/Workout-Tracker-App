// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);

 
  const assetExts = config.resolver.assetExts || [];
  if (!assetExts.includes('wasm')) {
    config.resolver.assetExts = [...assetExts, 'wasm'];
  }

  return config;
})();
