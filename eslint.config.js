import js from '@eslint/js';
import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  js.configs.recommended,
  {
    files: ['**/*.rules'],
    plugins: {
      'firebase-security-rules': firebaseRulesPlugin,
    },
    language: 'firebase-security-rules/firebase-security-rules',
    rules: {
      ...firebaseRulesPlugin.configs.recommended.rules,
    },
  },
];
