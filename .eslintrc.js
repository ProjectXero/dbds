module.exports = {
  env: {
    browser: false,
    node: true,
    es2020: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'prettier/@typescript-eslint',
    'plugin:jsonc/auto-config',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'prettier/prettier': 'error',
    'max-len': ['error', { code: 80, ignoreUrls: true }],
    'no-tabs': ['error', { allowIndentationTabs: true }],
    'no-restricted-syntax': [
      'error',
      {
        selector: 'SequenceExpression',
        message:
          'The comma operator is confusing and a common mistake. Don’t use it!',
      },
    ],
  },
  overrides: [
    {
      files: '*.js',
      env: {
        amd: true,
        commonjs: true,
      },
    },
  ],
}
