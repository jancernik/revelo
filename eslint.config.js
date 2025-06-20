import eslint from '@eslint/js'
import globals from 'globals'
import perfectionist from 'eslint-plugin-perfectionist'

export default [
  eslint.configs.recommended,
  perfectionist.configs['recommended-natural'],
  {
    ignores: ['client/*', 'tests/*', 'dist/*', '**/*.config.js', '**/pnpm-lock.yaml']
  },
  {
    languageOptions: {
      globals: { ...globals.node },
      ecmaVersion: 2022,
      sourceType: 'module'
    }
  },
  {
    files: ['api/**/*.js'],
    rules: {
      quotes: ['error', 'double', { avoidEscape: true }],
      semi: ['error', 'always'],
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['error'] }],
      'no-empty': 'error',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      'prefer-const': 'error'
    }
  }
]
