import { randomUUID } from 'node:crypto';

export const newCardId = (): string => `card-${randomUUID().slice(0, 8)}`;
export const newBoardId = (): string => `board-${randomUUID().slice(0, 8)}`;

/** 추측 어려운 공개 공유 토큰 (122비트 엔트로피). */
export const newShareId = (): string => randomUUID().replace(/-/g, '');
