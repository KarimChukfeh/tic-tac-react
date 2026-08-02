import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createV3EthPricePlugin } from './scripts/v3-eth-price-proxy.js'

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "connect-src 'self' http://127.0.0.1:8545 http://127.0.0.1:4337 http://127.0.0.1:4338 ws://localhost:3000 ws://127.0.0.1:3000",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "form-action 'self'",
].join('; ')

const productionSecurityHeaders = {
  'Content-Security-Policy': contentSecurityPolicy,
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
}

// Vite injects the React Fast Refresh preamble as an inline module in
// development. Keep this exception local to the dev server; preview and
// deployed builds retain the strict production policy above.
const developmentSecurityHeaders = {
  ...productionSecurityHeaders,
  'Content-Security-Policy': contentSecurityPolicy.replace(
    "script-src 'self'",
    "script-src 'self' 'unsafe-inline'",
  ),
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    // ENVIRONMENT is intentionally public and controls only which committed V3
    // deployment bundle is selected. Contract/RPC secrets must never use it.
    envPrefix: ['VITE_', 'ENVIRONMENT'],
    plugins: [
      react(),
      createV3EthPricePlugin({ apiKey: env.ETHERSCAN_API_KEY }),
    ],
    server: {
      port: 3000,
      open: true,
      allowedHosts: ['.ngrok-free.app', '.ngrok.io'],
      headers: developmentSecurityHeaders,
      proxy: {
        '/__v3/bundler-primary': {
          target: 'http://127.0.0.1:4337',
          changeOrigin: true,
          rewrite: () => '/',
        },
        '/__v3/bundler-failover': {
          target: 'http://127.0.0.1:4338',
          changeOrigin: true,
          rewrite: () => '/',
        },
      },
    },
    preview: {
      headers: productionSecurityHeaders,
    },
  }
})
