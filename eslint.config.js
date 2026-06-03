import js from '@eslint/js';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**', '*.config.*'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        crypto: 'readonly',
        fetch: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FormData: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        process: 'readonly',
        import: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
