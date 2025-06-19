// @ts-check

import tseslint from 'typescript-eslint';

export default tseslint.config({
  ignores: ['dist/'],
  extends: [
    ...tseslint.configs.recommended,
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      { 'argsIgnorePattern': '^_' },
    ],
  },
}); 