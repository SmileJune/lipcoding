import { randomUUID } from 'node:crypto';

export const newCardId = (): string => `card-${randomUUID().slice(0, 8)}`;
export const newBoardId = (): string => `board-${randomUUID().slice(0, 8)}`;
