module.exports = function override(config, env) {
  // Configure webpack to ignore Node.js modules that aren't available in browsers
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "fs": false,
    "path": false,
    "os": false,
    "crypto": false,
    "stream": false,
    "http": false,
    "https": false,
    "zlib": false,
    "url": false,
    "assert": false,
    "util": false,
    "buffer": false,
    "process": false
  };

  // Ignore Node.js built-in modules warnings
  config.ignoreWarnings = [
    ...(config.ignoreWarnings || []),
    {
      module: /node_modules\/face-api\.js/,
    },
    {
      module: /node_modules\/tfjs-image-recognition-base/,
    }
  ];

  return config;
};