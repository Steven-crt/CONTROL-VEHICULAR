import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // ==================== SEGURIDAD ====================

      // Prohibir dangerouslySetInnerHTML completamente
      'react/no-danger': 'error',

      // Prohibir children + dangerouslySetInnerHTML combinados
      'react/no-danger-with-children': 'error',

      // Prohibir innerHTML directo (obliga a usar DOMPurify o textContent)
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'AssignmentExpression[operator="="] MemberExpression[property.name="innerHTML"]',
          message:
            'Usar innerHTML directamente es inseguro. Usa DOMPurify.sanitize() o textContent.',
        },
        {
          selector:
            'CallExpression[callee.property.name="insertAdjacentHTML"]',
          message:
            'Usar insertAdjacentHTML directamente es inseguro. Usa DOMPurify.sanitize() primero.',
        },
        {
          selector:
            'AssignmentExpression[operator="="] MemberExpression[property.name="outerHTML"]',
          message:
            'Usar outerHTML directamente es inseguro. Usa DOMPurify.sanitize() o textContent.',
        },
      ],

      // ==================== BUENAS PRÁCTICAS ====================
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Evitar console.log en producción
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // Ignorar node_modules y dist
  {
    ignores: ['node_modules/**', 'dist/**'],
  },
]
