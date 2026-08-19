import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/rafiki/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/rafiki': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/rafiki/, ''),
        bypass: (req, _res, _options) => {
          const url = req.url || '';
          const apiPattern = /^\/rafiki\/(auth|roles|organizations|teams|departments|employees|leave-policies|leaves|attendance|permissions|settings|branches|notifications|banks|payroll|exit|designations|assets|assignments|lms|audit|recruitment|public|survey|edition|surveys|user-types|news|documents|loans-advances|loan-types|loan-applications|change-requests|feedback|news-feed|api|upload)/;
          if (!apiPattern.test(url)) {
            return url;
          }
        },
      },
      '/public': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/upload': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
