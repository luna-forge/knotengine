module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier'],
  ignorePatterns: [
    '**/dist/**',
    '**/node_modules/**',
    '**/.next/**',
    '.eslintrc.js',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    'no-var': 'error',
    eqeqeq: 'error',
    'no-implicit-coercion': 'error',
  },
  env: {
    node: true,
    es2020: true,
    serviceworker: true,
  },
  overrides: [
    {
      files: ['**/public/sw.js'],
      globals: {
        self: 'readonly',
        caches: 'readonly',
        clients: 'readonly',
      },
    },
  ],
};
