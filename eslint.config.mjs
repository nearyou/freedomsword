import js from '@eslint/js';
import ts from 'typescript-eslint';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
import a11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';
const config = ts.config(
  {
    ignores: ['.next/**', '.next-staging/**', 'node_modules/**', 'next-env.d.ts', 'artifacts/**', '.local-postgres/**'],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  { files: ['**/*.ts', '**/*.tsx'], rules: { 'no-undef': 'off' } },
  {
    files: ['**/*.tsx'],
    ...react.configs.flat.recommended,
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
  {
    files: ['**/*.tsx', 'src/components/**/*.ts'],
    plugins: { 'react-hooks': hooks },
    rules: hooks.configs.recommended.rules,
  },
  { files: ['**/*.tsx'], ...a11y.flatConfigs.recommended },
);
export default config;
