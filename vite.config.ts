import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // `public/` contains a separate, untracked dashboard prototype. Use the
  // tracked static directory for production metadata without shipping it.
  // Do not serve the production CSP through `netlify dev`: it would block
  // Vite's inline React Fast Refresh preamble and leave the local page blank.
  publicDir: command === 'build' ? 'static' : false,
}));
