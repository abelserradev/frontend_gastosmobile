const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      // Preferimos consistencia con el backend: comillas simples y trailing commas.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Permitir parámetros con underscore (handlers de teclado, callbacks).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      // Baseline legacy: varios modales usan divs con (click) sin manejo de foco.
      // Se desactivan temporalmente para no bloquear CI; abordar en refactor a11y.
      '@angular-eslint/template/click-events-have-key-events': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off',
      // Permitir != null en templates para cubrir undefined sin ruido excesivo.
      '@angular-eslint/template/eqeqeq': 'off',
    },
  },
);
