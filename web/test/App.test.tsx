import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { api } from '../src/api';
import type { Card } from '../src/types';

vi.mock('../src/api', () => ({
  api: {
    health: vi.fn(),
    listBoards: vi.fn(),
    listCards: vi.fn(),
    createCardFromUrl: vi.fn(),
    updateCard: vi.fn(),
    deleteCard: vi.fn(),
    createBoard: vi.fn(),
    organize: vi.fn(),
    chat: vi.fn(),
  },
}));

const mockedApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

function makeCard(over: Partial<Card>): Card {
  return {
    id: 'card-1',
    boardId: 'board-default',
    sourceUrl: 'https://x.com',
    title: '새 카드',
    summary: '요약',
    keyPoints: [],
    tags: [],
    memo: '',
    color: 'default',
    posX: 0,
    posY: 0,
    imageUrl: null,
    status: 'ready',
    createdAt: 'x',
    updatedAt: 'x',
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.health.mockResolvedValue({ status: 'ok', copilotMode: 'live' });
  mockedApi.listBoards.mockResolvedValue([{ id: 'board-default', name: '전체', createdAt: 'x' }]);
  mockedApi.listCards.mockResolvedValue([]);
});

describe('App', () => {
  it('보드 목록과 Copilot 배지 로드', async () => {
    render(<App />);
    expect(await screen.findByText('전체')).toBeInTheDocument();
    expect(await screen.findByText(/LIVE/)).toBeInTheDocument();
  });

  it('링크 입력 → 카드 생성 흐름', async () => {
    mockedApi.createCardFromUrl.mockResolvedValue(makeCard({ title: '새 카드' }));
    render(<App />);
    await screen.findByText('전체');

    await userEvent.type(screen.getByLabelText('링크 입력'), 'https://x.com');
    await userEvent.click(screen.getByRole('button', { name: /카드 만들기/ }));

    expect(await screen.findByText('새 카드')).toBeInTheDocument();
    expect(mockedApi.createCardFromUrl).toHaveBeenCalledWith('https://x.com', 'board-default');
  });

  it('AI 도우미 토글로 패널 표시', async () => {
    render(<App />);
    await screen.findByText('전체');
    await userEvent.click(screen.getByText('🤖 AI 도우미'));
    expect(screen.getByRole('region', { name: 'AI 도우미' })).toBeInTheDocument();
  });
});
