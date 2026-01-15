const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  entry: '/src/index',
  experiments: { outputModule: true },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },

  output: {
    publicPath: 'auto',
  },
  optimization: {
    runtimeChunk: false,
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'Custom extensions',
      filename: 'remoteEntry.js',
      exposes: {
        './CustomAuth': './libs/custom-auth/src/lib/custom-auth-service.ts',
      },
      library: {
        type: 'module',
      },
    }),
  ],
};
