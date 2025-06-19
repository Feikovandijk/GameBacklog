// @ts-check

// Using require for typescript-eslint in a .cjs file
const tseslint = require('typescript-eslint');

// Using module.exports for a .cjs file
module.exports = tseslint.config({
  ignores: ['dist/'],
  extends: [
    ...tseslint.configs.recommended,
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      { 'argsIgnorePattern': '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'off'
  },
}); 