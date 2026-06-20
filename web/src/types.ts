// 백엔드(api/openapi.yaml)와 일치하는 프론트 타입.

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
  shareId: string | null;
}

/** 공개(읽기 전용) 보드 보기 — shareId 로 접근. */
export interface SharedBoardView {
  board: { id: string; name: string };
  owner: { name: string; avatarUrl: string | null } | null;
  cards: Card[];
}

export interface OrganizeGroup {
  label: string;
  cardIds: string[];
}

/** 보드 인사이트 종류 — 연결·긴장·빈틈·다음 질문. */
export type InsightKind = 'connection' | 'tension' | 'gap' | 'question';

/** 카드를 가로질러 추론한 한 가지 인사이트. */
export interface Insight {
  kind: InsightKind;
  title: string;
  detail: string;
  cardIds: string[];
}

/** 아직 서버 응답을 기다리는, 생성 중인 카드(스켈레톤 표시용). */
export interface PendingCard {
  id: string;
  url: string;
}

export type CopilotMode = 'live' | 'demo';
export type AuthMode = 'live' | 'demo';

export interface Health {
  status: string;
  copilotMode: CopilotMode;
  authMode?: AuthMode;
  version?: string;
}

export type AuthProvider = 'github' | 'demo';

export interface User {
  id: string;
  provider: AuthProvider;
  login: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface AuthInfo {
  user: User | null;
  authMode: AuthMode;
}
