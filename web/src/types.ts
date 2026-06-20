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
}

export interface OrganizeGroup {
  label: string;
  cardIds: string[];
}

export type CopilotMode = 'live' | 'demo';

export interface Health {
  status: string;
  copilotMode: CopilotMode;
  version?: string;
}
