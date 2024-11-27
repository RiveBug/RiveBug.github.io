import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';

export default defineConfig({
  plugins: [
    checker({
      typescript: true,
      overlay: false,
      enableBuild: true
    })
  ],
  root: 'src', // Set root to src directory where index.html lives
  publicDir: '../public', // If you have any static assets, they should go in a public directory
  build: {
    outDir: '../../', // Build output needs to be relative to root
    emptyOutDir: false,
    rollupOptions: {
      input: './src/index.html' // Since root is 'src', this is relative to that
    }
  }
});