// craco.config.js
module.exports = {
  webpack: {
    configure: (config) => {
      // Allow bare imports in ESM modules
      config.module.rules.push({
        test: /\.m?js$/,
        resolve: { fullySpecified: false },
      });
      return config;
    },
  },
};
