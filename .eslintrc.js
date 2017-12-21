module.exports = {
  extends: 'airbnb-base',
  plugins: [
    'import',
  ],
  rules: {
    // Provide a warning for TODO and FIXME comments
    'no-warning-comments': ['warn', {
      'terms': ['todo', 'fixme', 'xxx'],
      'location': 'start'
    }]
  },
};
