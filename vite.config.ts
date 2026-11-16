import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base를 상대 경로('./')로 두면 빌드된 HTML이 JS·CSS·이미지를 상대 경로로 불러옵니다.
// 그래서 GitHub Pages의 저장소 하위 경로(https://<사용자>.github.io/<저장소>/)에서도,
// 저장소 이름이 바뀌어도 그대로 동작합니다. (해시 라우팅도 쓰지 않는 한 페이지 사이트)
export default defineConfig({
  base: './',
  plugins: [react()],
});
