// CHG-0045: one strict, type-aware ESLint setup for every TypeScript file in the repo.
import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const ignoredPaths = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '.cache/**',
  '.runs/**',
  '**/generated/**',
  'web/src/v1ui/ported/**',
  'web/public/**',
  'glossary/.astro/**',
  'tests/visual/output/**',
  'tests/audio/output/**',
  'tests/e2e/output/**',
];

const singleLetterNamesAllowed = ['x', 'y', 'z', 'i', 'j', 'k', 'a', 'b', '_'];

export default tseslint.config(
  { ignores: ignoredPaths },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
      '@typescript-eslint/restrict-plus-operands': ['error', { allowNumberAndString: true }],
      '@typescript-eslint/no-empty-function': ['error', { allow: ['arrowFunctions'] }],
      // An empty string falling back to a default ('' title → 'Untitled') is intended.
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        { ignorePrimitives: { string: true } },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        {
          selector: 'variable',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
        { selector: 'parameter', format: ['camelCase', 'PascalCase'], leadingUnderscore: 'allow' },
      ],
      'id-length': ['error', { min: 2, properties: 'never', exceptions: singleLetterNamesAllowed }],
      eqeqeq: ['error', 'always'],
      'no-console': 'off',
      'prefer-const': 'error',
    },
  },
  {
    files: ['web/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['server/**/*.ts'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
  {
    files: ['tools/**/*.ts', 'tests/**/*.ts', 'shared/**/*.ts', 'eslint.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  ...astro.configs['flat/recommended'],
  {
    files: ['**/*.astro'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { ...globals.node } },
  },
);
