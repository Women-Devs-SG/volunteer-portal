import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist/**', '.netlify/**', 'node_modules/**'] },
  { ...js.configs.recommended, files: ['**/*.mjs'], languageOptions: {
    globals: Object.fromEntries(['console', 'process', 'Buffer', 'fetch', 'Response', 'Request', 'URL', 'AbortController', 'setTimeout', 'clearTimeout'].map((name) => [name, 'readonly'])),
  } },
  ...ts.configs.recommended,
  // This validator deliberately removes control characters from user input.
  { files: ['lib/validate.mjs'], rules: { 'no-control-regex': 'off' } },
  { files: ['**/*.ts', '**/*.tsx'], plugins: { 'react-hooks': hooks }, rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
  } },
];
