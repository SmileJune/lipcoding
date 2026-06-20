// Curio 공용 타입 및 에러

export type CardColor =
  | 'default'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'pink'
  | 'purple'
  | 'gray';

export type CardStatus = 'ready' | 'summarizing' | 'error';

export const CARD_COLORS: CardColor[] = [
  'default',
  'yellow',
  'green',
  'blue',
  'pink',
  'purple',
  'gray',
];

export interface Card {
  id: string;
  boardId: string;
  sourceUrl: string;
  title: string;
  summary: string;
  keyPoints: string[];
  tags: string[];
  memo: string;
  color: CardColor;
  posX: number;
  posY: number;
  imageUrl: string | null;
  status: CardStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: string;
  name: string;
  createdAt: string;
}

/** AI 요약 결과 */
export interface Summary {
  title: string;
  summary: string;
  keyPoints: string[];
  tags: string[];
}

/** 본문 추출 결과 */
export interface Article {
  url: string;
  title: string;
  text: string;
  imageUrl: string | null;
}

export interface OrganizeGroup {
  label: string;
  cardIds: string[];
}

/** HTTP 상태 코드를 가진 에러 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export const DEFAULT_BOARD_ID = 'board-default';
export const DEFAULT_BOARD_NAME = '전체';

/** 데이터 저장소 인터페이스 (인메모리 / Cosmos 공통) */
export interface Store {
  ensureSeed(): Promise<void>;
  listBoards(): Promise<Board[]>;
  getBoard(id: string): Promise<Board | undefined>;
  createBoard(name: string): Promise<Board>;
  addCard(card: Card): Promise<Card>;
  getCard(id: string): Promise<Card | undefined>;
  listCards(boardId?: string): Promise<Card[]>;
  updateCard(id: string, patch: Partial<Card>): Promise<Card | undefined>;
  deleteCard(id: string): Promise<boolean>;
}
