// 스토어 셀렉터: COSMOS_ENDPOINT 설정 시 Cosmos, 아니면 인메모리.
import { memoryStore, resetMemory } from './memory-store.js';
import type { Store } from './types.js';

export { defaultBoardId, DEMO_USER, DEMO_USER_ID } from './types.js';
export { newCardId, newShareId } from './id.js';
export { resetMemory };

let activeStore: Store = memoryStore;

/** 현재 활성 스토어. */
export function getStore(): Store {
  return activeStore;
}

/**
 * 스토어 초기화 (서버 시작 시 1회). COSMOS_ENDPOINT 가 있으면 Cosmos 로 전환.
 * cosmos-store 는 동적 import 라 로컬/테스트에서 Azure SDK 로드가 불필요하다.
 * 사용자별 시드는 인증 시 ensureUserSeed 로 처리하므로 여기서는 전환만 한다.
 */
export async function initStore(): Promise<Store> {
  if (process.env.COSMOS_ENDPOINT) {
    const { createCosmosStore } = await import('./cosmos-store.js');
    activeStore = createCosmosStore();
  } else {
    activeStore = memoryStore;
  }
  return activeStore;
}
