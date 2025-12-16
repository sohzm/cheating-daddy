import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    base: './',
    root: './src/renderer',
    publicDir: '../assets',
    build: {
        outDir: '../../dist/renderer',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'src/renderer/index.html')
            }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src/renderer'),
            '@assets': path.resolve(__dirname, './src/assets')
        }
    },
    server: {
        port: 3000
    }
});