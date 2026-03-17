import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';

// 需要 externalize 的模块（原生模块 + 动态 require 复杂的包）
// .npmrc 设置 shamefully-hoist=true 确保 electron-builder 能打包所有传递依赖
const externalDeps = ['better-sqlite3', 'bufferutil', 'utf-8-validate', 'adm-zip'];

// 匹配包名及其所有子路径
const isExternal = (id: string) => {
  return externalDeps.some(dep => id === dep || id.startsWith(dep + '/'));
};

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: isExternal,
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(args) {
          args.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: isExternal,
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
