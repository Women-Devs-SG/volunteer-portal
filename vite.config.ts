import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // `public/` contains a separate, untracked dashboard prototype. Keep it for
  // the follow-up React migration without copying it into this portal build.
  publicDir: false,
});
