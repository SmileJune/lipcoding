// 스토어 셀렉터: COSMOS_ENDPOINT 설정 시 Cosmos, 아니면 인메모리.
import { memoryStore, resetMemory } from './memory-store.js';
import type { Store } from './types.js';

export { DEFAULT_BOARD_ID } from './types.js';
export { newCardId } from './id.js';
export { resetMemory };

let activeStore: Store = memoryStore;

/** 현재 활성 스토어. */
export function getStore(): Store {
  return activeStore;
}

/**
 * 스토어 초기화 (서버 시작 시 1회). COSMOS_ENDPOINT 가 있으면 Cosmos 로 전환.
 * cosmos-store 는 동적 import 라 로컬/테스트에서 Azure SDK 로드가 불필요하다.
 */
export async function initStore(): Promise<Store> {
  if (process.env.COSMOS_ENDPOINT) {
    const { createCosmosStore } = await import('./cosmos-store.js');
    activeStore = createCosmosStore();
  } else {
    activeStore = memoryStore;
  }
  await activeStore.ensureSeed();
  return activeStore;
}
