module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
  ],
  plugins: [
    'babel-plugin-transform-vite-meta-env', // Specifically for import.meta.env
    // Relying on jest.setup.js for the actual values of import.meta.env at runtime
  ],
};
