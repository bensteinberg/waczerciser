import { defineConfig } from 'vite'
import { resolve } from 'path'
import { copyFileSync, mkdirSync } from 'fs'
import path from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        sw: 'src/lib/sw.ts',
        ui: 'src/lib/ui.ts',
      },
      output: {
        dir: 'static/embed/replay-web-page',
        entryFileNames: '[name].js'
      }
    },
  },
  watch: {
    include: [
      'src/player/**',
    ]
  },
  plugins: [{
    name: 'copy-html',
    closeBundle() {
      const outDir = resolve(__dirname, 'static');
      
      for (const file of ['host/index.html', 'embed/index.js', 'embed/index.html']) {
        mkdirSync(resolve(outDir, path.dirname(file)), { recursive: true });
        copyFileSync(
          resolve(__dirname, `src/player/${file}`),
          resolve(outDir, file)
        );
      }
      // copyFileSync(
      //   resolve(__dirname, 'node_modules/replaywebpage/ui.js'),
      //   resolve(outDir, 'embed/replay-web-page/ui.js')
      // );
    },
    buildStart() {
      for (const file of ['host/index.html', 'embed/index.js', 'embed/index.html']) {
        this.addWatchFile(resolve(__dirname, `src/player/${file}`))
      }
    }
  }]
})