import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'https://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'https://localhost:3001',
        ws: true,
        changeOrigin: true,
        secure: false
      }
    },
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  },
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) return 'react-vendor'
          if (id.includes('node_modules/react')) return 'react-vendor'
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/react-hot-toast')) return 'ui-vendor'
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/react-chartjs-2')) return 'chart-vendor'
          if (id.includes('node_modules/leaflet')) return 'map-vendor'
          if (id.includes('node_modules/socket.io-client')) return 'socket-vendor'
        }
      }
    },

  }
})
