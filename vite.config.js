import { defineConfig } from 'vite'
import { resolve } from 'path'
import { copyFileSync, mkdirSync } from 'fs'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        sw: 'src/lib/sw.ts'
      },
      output: {
        dir: 'static/embed/replay_web_page',
        entryFileNames: '[name].js'
      }
    }
  },
  plugins: [{
    name: 'copy-html',
    closeBundle() {
      // Ensure directories exist
      mkdirSync('static/host', { recursive: true });
      
      copyFileSync(
        resolve(__dirname, 'src/assets/index.html'),
        resolve(__dirname, 'static/host/index.html')
      );
      copyFileSync(
        resolve(__dirname, 'contrib/wacz-exhibitor/html/embed/index.js'),
        resolve(__dirname, 'static/embed/index.js')
      );
      copyFileSync(
        resolve(__dirname, 'contrib/wacz-exhibitor/html/embed/index.html'),
        resolve(__dirname, 'static/embed/index.html')
      );
      copyFileSync(
        resolve(__dirname, 'contrib/wacz-exhibitor/html/replay-web-page/ui.js'),
        resolve(__dirname, 'static/embed/replay_web_page/ui.js')
      );
    }
  }]
})