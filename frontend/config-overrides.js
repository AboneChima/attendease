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

  // Disable source-map-loader for problematic modules
  config.module.rules = config.module.rules.map(rule => {
    if (rule.enforce === 'pre' && rule.use && rule.use.some(use => 
      use.loader && use.loader.includes('source-map-loader')
    )) {
      return {
        ...rule,
        exclude: [
          /node_modules\/face-api\.js/,
          /node_modules\/react-router-dom/,
          /node_modules\/tslib/,
          ...(rule.exclude ? [rule.exclude] : [])
        ]
      };
    }
    return rule;
  });

  // Ignore Node.js built-in modules warnings
  config.ignoreWarnings = [
    ...(config.ignoreWarnings || []),
    {
      module: /node_modules\/face-api\.js/,
    },
    {
      module: /node_modules\/tfjs-image-recognition-base/,
    },
    {
      module: /node_modules\/react-router-dom/,
    },
    {
      module: /node_modules\/tslib/,
    }
  ];

  return config;
};