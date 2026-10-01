import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command }) => ({
  // Netlify Dev applies the production CSP locally. That policy correctly
  // blocks inline scripts, including the Fast Refresh preamble injected by
  // the React plugin. Vite still compiles TSX through esbuild in development;
  // keep the plugin for production builds without blanking the local portal.
  plugins: [tailwindcss(), ...(command === 'build' ? [react()] : [])],
  // `public/` contains a separate, untracked dashboard prototype. Use the
  // tracked static directory only when producing the deployable build.
  publicDir: command === 'build' ? 'static' : false,
  optimizeDeps: { entries: ['index.html'] },
}));
