import coreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...coreWebVitals,
  ...nextTs,
  {
    ignores: ['.next/**', 'out/**', 'next-env.d.ts', 'node_modules/**'],
  },
]
