import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    allowedHosts: ['.ngrok-free.app', '.ngrok.io'],
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
  }
})
