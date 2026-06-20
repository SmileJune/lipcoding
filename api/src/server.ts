// 진입점: 루트 .env 로드 후 서버 시작.
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createApp } from './app.js';
import { copilotMode } from './ai.js';
import { authMode } from './auth.js';
import { initStore } from './store.js';

const here = dirname(fileURLToPath(import.meta.url));
// src/ 또는 dist/ → 프로젝트 루트의 .env (로컬 전용; 프로덕션은 App Service 설정 사용)
config({ path: resolve(here, '../../.env') });
config(); // api/.env 가 있으면 보조 로드

const port = Number(process.env.PORT) || Number(process.env.WEBSITES_PORT) || 7071;
const dataMode = process.env.COSMOS_ENDPOINT ? 'cosmos' : 'memory';

await initStore();

const app = createApp();

app.listen(port, '0.0.0.0', () => {
  console.log(
    `Curio API on :${port} (copilot: ${copilotMode()}, store: ${dataMode}, auth: ${authMode()})`,
  );
});
