// craco.config.js
module.exports = {
  webpack: {
    configure: (config) => {
      // Allow bare imports like './printError' and '../language/location'
      config.module.rules.push({
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      });

      // Ignore specific noisy warnings
      const existing = config.ignoreWarnings || [];
      config.ignoreWarnings = existing.concat([
        /Should not import the named export 'name'/,
        /Failed to parse source map .*@aws-sdk/
      ]);

      return config;
    },
  },
};
