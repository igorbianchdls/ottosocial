import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const config = [...nextVitals, ...nextTs, { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'workers/**',
  // The video factory (compositions and their preview) came from Cognito, where it was outside the lint as well.
  'src/assets/**', 'src/app/remotion-preview/**', 'src/components/icons/**', 'remotion.config.ts'] }]

export default config
