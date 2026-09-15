import { defineConfig } from 'vite';
import react from '@vitejs.plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/repository-name/', // Replace 'repository-name' with your exact GitHub repo name
});

