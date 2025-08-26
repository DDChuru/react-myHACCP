const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Reduce memory usage - limit workers
config.maxWorkers = 2;

// Disable cache reset to reduce memory
config.resetCache = false;

// Add any problematic node_modules to watchFolders blacklist
config.resolver.blacklistRE = /node_modules\/.*\/node_modules\/react-native\/.*/;

// Reduce transformer memory usage
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: false,
    mangle: true,
  },
};

// Disable file watching for reduced memory
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Reduce keep-alive to free memory faster
      res.setHeader('Connection', 'close');
      return middleware(req, res, next);
    };
  },
};

module.exports = config;