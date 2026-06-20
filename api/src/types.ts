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
  ownerId: string;
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
  ownerId: string;
  name: string;
  createdAt: string;
  /** 공개 공유 토큰. null 이면 비공개. */
  shareId: string | null;
}

/** 공개(읽기 전용) 보드 보기 — 인증 없이 shareId 로 접근. */
export interface SharedBoardView {
  board: { id: string; name: string };
  owner: { name: string; avatarUrl: string | null } | null;
  cards: Card[];
}

/** 인증 제공자 */
export type AuthProvider = 'github' | 'demo';

/** 사용자 */
export interface User {
  id: string; // 예: "github:12345" / "demo"
  provider: AuthProvider;
  login: string;
  name: string;
  avatarUrl: string | null;
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

/**
 * 보드 인사이트 종류 — 카드를 가로질러 추론한 관계.
 * connection: 서로 연결되는 카드 / tension: 상충·긴장 / gap: 빠진 관점·빈틈 / question: 다음에 탐구할 질문.
 */
export type InsightKind = 'connection' | 'tension' | 'gap' | 'question';

/** 여러 카드를 종합해 도출한 한 가지 인사이트. */
export interface Insight {
  kind: InsightKind;
  title: string;
  detail: string;
  /** 근거가 되는 카드 id (gap/question 은 비어 있을 수 있음). */
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

export const DEFAULT_BOARD_NAME = '전체';

/** 데모(비로그인) 사용자 — OAuth 미설정 시 폴백 */
export const DEMO_USER_ID = 'demo';
export const DEMO_USER: User = {
  id: DEMO_USER_ID,
  provider: 'demo',
  login: 'demo',
  name: '데모 사용자',
  avatarUrl: null,
  createdAt: '1970-01-01T00:00:00.000Z',
};

/** 사용자별 기본 보드 id (결정적) */
export function defaultBoardId(ownerId: string): string {
  return `board-${ownerId.replace(/[^a-zA-Z0-9_-]/g, '_')}-default`;
}

/** 데이터 저장소 인터페이스 (인메모리 / Cosmos 공통) — 모든 조회는 ownerId 로 격리 */
export interface Store {
  ensureUserSeed(ownerId: string): Promise<void>;
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: User): Promise<User>;
  listBoards(ownerId: string): Promise<Board[]>;
  getBoard(ownerId: string, id: string): Promise<Board | undefined>;
  createBoard(ownerId: string, name: string): Promise<Board>;
  updateBoard(
    ownerId: string,
    id: string,
    patch: Partial<Pick<Board, 'name' | 'shareId'>>,
  ): Promise<Board | undefined>;
  /** 공유 토큰으로 보드 조회 (소유자 무관, 공개 보기용). */
  getBoardByShareId(shareId: string): Promise<Board | undefined>;
  /** 보드 id 로 카드 목록 (소유자 무관, 공개 보기용). */
  listCardsByBoardId(boardId: string): Promise<Card[]>;
  addCard(card: Card): Promise<Card>;
  getCard(ownerId: string, id: string): Promise<Card | undefined>;
  listCards(ownerId: string, boardId?: string): Promise<Card[]>;
  updateCard(ownerId: string, id: string, patch: Partial<Card>): Promise<Card | undefined>;
  deleteCard(ownerId: string, id: string): Promise<boolean>;
}
