import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // ECharts·카카오 SDK 래퍼가 커서 기본 경고 기준(500kB)을 넘는다
    chunkSizeWarningLimit: 1200,
  },
})
