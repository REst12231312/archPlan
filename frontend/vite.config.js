import { defineConfig } from 'vite'
import { resolve } from 'node:path'

const page = name => resolve(process.cwd(), name)

export default defineConfig({
  server: { proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } } },
  build: {
    rollupOptions: {
      input: {
        home: page('index.html'),
        templates: page('templates.html'),
        editor: page('editor.html'),
        estimate: page('estimate.html'),
        about: page('about.html'),
        account: page('account.html'),
      },
    },
  },
})
