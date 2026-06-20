// 진입점: 루트 .env 로드 후 서버 시작.
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createApp } from './app.js';
import { copilotMode } from './ai.js';

const here = dirname(fileURLToPath(import.meta.url));
// src/ 또는 dist/ → 프로젝트 루트의 .env
config({ path: resolve(here, '../../.env') });
config(); // api/.env 가 있으면 보조 로드

const port = Number(process.env.PORT) || 7071;
const app = createApp();

app.listen(port, () => {
  console.log(
    `Curio API listening on http://localhost:${port} (copilot: ${copilotMode()})`,
  );
});
