module.exports = {
  webpack: {
    configure: (config) => {
      config.module.rules.push({
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      });

      if (!config.resolve.extensions.includes(".mjs")) {
        config.resolve.extensions.push(".mjs");
      }

      return config;
    },
  },
};
