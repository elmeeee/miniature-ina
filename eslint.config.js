import tseslint from 'typescript-eslint';

export default [
  { ignores: ['**/dist/**', 'apps/mobile/android/**', 'apps/mobile/ios/**'] },
  ...tseslint.configs.recommended,
];
