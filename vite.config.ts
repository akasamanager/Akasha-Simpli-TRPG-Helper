import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // GitHub Pages 등 서브 디렉토리 배포를 위해 상대 경로 사용
  define: {
    // process.env 참조 에러 방지를 위한 빈 객체 주입 (API_KEY는 별도 설정 필요)
    'process.env': {} 
  }
});