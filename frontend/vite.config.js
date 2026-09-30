import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    // Sin sourcemap: un .map allowiria reconstruir el codigo fuente original y
    // sus comentarios (CWE-615).
    sourcemap: false,
    // La minificacion (Oxc por defecto en Vite 8) ya elimina los comentarios, y
    // el bundle actual tiene 0 comentarios y 0 sourcemaps. No hace falta anadir
    // opciones, pero conviene no romper esto por accidente:
    //
    //  - minify:'esbuild' -> Vite 8 marca transformWithEsbuild como deprecated y
    //    exige esbuild como dependencia aparte: el build falla.
    //  - minify:'terser'  -> terser es dependencia opcional y no esta instalada:
    //    el build falla con "terser not found".
    //  - terserOptions    -> Vite SOLO lo lee si minify === 'terser'
    //    (si no, se ignora en silencio y no aporta ninguna garantia).
    //  - rolldownOptions.output.comments:false -> es la opcion que si borraria
    //    los comentarios legales, pero el binding nativo de rolldown da
    //    PARSE_ERROR con ella.
    //
    // Si alguna vez hay que forzar legalComments:'none', hay que actualizar
    // rolldown; mientras tanto, la verificacion es comprobar el bundle:
    //   Select-String -Path dist\assets\*.js -Pattern '/\*' -SimpleMatch
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
