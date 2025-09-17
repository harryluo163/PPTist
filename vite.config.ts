import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import viteCompression from 'vite-plugin-compression' // 新增插件
// https://vitejs.dev/config/
export default defineConfig({
  base: '',
  plugins: [
    vue(),
    viteCompression({ // 新增压缩配置
      algorithm: 'gzip',          // 使用 gzip 压缩
      ext: '.gz',                 // 压缩文件扩展名
      threshold: 10240,           // 仅压缩大于 10KB 的文件
      deleteOriginFile: false     // 保留原始文件
    })
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000/aippt_data',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @import '@/assets/styles/variable.scss';
          @import '@/assets/styles/mixin.scss';
        `
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // 新增以下配置以支持调试
  build: {
    minify: false, // 保持压缩（可选，如果不需要压缩可设为false）
    sourcemap: true, // 生成source map文件
    cssMinify: false, // 压缩CSS（可选）
    rollupOptions: {
      output: {
        // 保留模块间的函数名（对调试有帮助）
        preserveModules: false,
        // 可选：手动控制sourcemap生成
        sourcemap: true,
        // 可选：为特定文件生成sourcemap
        // sourcemapExcludeSources: false
      }
    }
  }
})
