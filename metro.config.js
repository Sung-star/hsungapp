// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ignore TypeScript type definition files from being treated as routes
config.resolver.blockList = [
  /app\/types\/.*/,
  /.*\.d\.ts$/,
];

module.exports = config;