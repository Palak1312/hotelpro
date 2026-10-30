import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import 'dotenv/config'
import api from './server/app.js'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'hotelpro-api-dev',
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url?.startsWith('/api/')) return api(request, response, next)
          next()
        })
      },
    },
  ],
})
