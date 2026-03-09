module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'google',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json'],
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  ignorePatterns: [
    '/lib/**/*', // Ignore built files.
    '/generated/**/*', // Ignore generated files.
    '.eslintrc.js', // Not part of the TS project.
    'test/**/*', // Test files use a separate vitest config.
    'vitest.config.ts', // Not part of the main TS project.
  ],
  plugins: [
    '@typescript-eslint',
    'import',
  ],
  rules: {
    'quotes': ['error', 'single'],
    'semi': ['error', 'never'],
    'linebreak-style': ['error', 'unix'],
    'indent': ['error', 2],
    'import/no-unresolved': 0,
    'require-jsdoc': 'off',
    'max-len': 'off',
  },
}
