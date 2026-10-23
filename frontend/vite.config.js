import { defineConfig } from 'vite'
import { resolve } from 'node:path'

const page = name => resolve(process.cwd(), name)

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: page('index.html'),
        templates: page('templates.html'),
        editor: page('editor.html'),
        estimate: page('estimate.html'),
        about: page('about.html'),
      },
    },
  },
})
