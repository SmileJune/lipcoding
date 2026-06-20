// 드래그앤드롭 위치 계산 (순수 함수 → 테스트 용이).
import type { Card } from './types';

export interface Delta {
  x: number;
  y: number;
}

/** 드래그 델타를 적용한 다음 좌표(음수 방지). */
export function nextPosition(card: Pick<Card, 'posX' | 'posY'>, delta: Delta): {
  posX: number;
  posY: number;
} {
  return {
    posX: Math.max(0, Math.round(card.posX + delta.x)),
    posY: Math.max(0, Math.round(card.posY + delta.y)),
  };
}
