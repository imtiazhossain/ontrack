// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/immutability': 'off',
    },
  },
  {
    ignores: [
      'dist/*',
      '.expo/**',
      'output/**',
      'tmp/**',
      '**/build/**',
      // Supabase Edge Functions are Deno modules and use npm: import specifiers.
      // They are linted by the Supabase/Deno toolchain rather than Expo ESLint.
      'supabase/functions/**',
    ],
  }
]);
