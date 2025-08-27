module.exports = {
  extends: ['airbnb-base'],
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  rules: {
    'no-console': 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-underscore-dangle': 'off'
  }
};
