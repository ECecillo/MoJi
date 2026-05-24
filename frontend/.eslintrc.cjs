/* eslint-env node */
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: 'detect' },
    'import/resolver': {
      typescript: { project: './tsconfig.json' },
      node: { extensions: ['.ts', '.tsx', '.js', '.jsx'] },
    },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'react-refresh', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // Hexagonal boundary: forbid domain -> adapters imports.
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/adapters/**', '../../adapters/**', '../adapters/**'],
            message: 'src/domain/ ne doit pas importer src/adapters/. Utiliser un port à la place.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: [
        'src/adapters/**/*.{ts,tsx}',
        'src/features/**/*.{ts,tsx}',
        'src/ui/**/*.{ts,tsx}',
        'src/main.tsx',
        'src/App.tsx',
      ],
      rules: { 'no-restricted-imports': 'off' },
    },
    {
      files: ['**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      files: ['scripts/**/*.ts'],
      env: { node: true, browser: false },
      rules: {
        'no-console': 'off',
        // Scripts Node : pas de garde-fou hexagonal (ils peuvent tout faire).
        'no-restricted-imports': 'off',
      },
    },
  ],
  ignorePatterns: ['dist', 'node_modules', 'coverage', '*.cjs', 'postcss.config.js'],
};
