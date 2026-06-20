import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { api } from '../src/api';
import type { Card } from '../src/types';

vi.mock('../src/api', () => ({
  api: {
    health: vi.fn(),
    me: vi.fn(),
    logout: vi.fn(),
    listBoards: vi.fn(),
    listCards: vi.fn(),
    createCardFromUrl: vi.fn(),
    updateCard: vi.fn(),
    deleteCard: vi.fn(),
    createBoard: vi.fn(),
    organize: vi.fn(),
    chat: vi.fn(),
    shareBoard: vi.fn(),
    unshareBoard: vi.fn(),
    getSharedBoard: vi.fn(),
  },
}));

const mockedApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

const DEMO_USER = {
  id: 'demo',
  provider: 'demo' as const,
  login: 'demo',
  name: '데모 사용자',
  avatarUrl: null,
  createdAt: 'x',
};

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
  mockedApi.me.mockResolvedValue({ user: DEMO_USER, authMode: 'demo' });
  mockedApi.health.mockResolvedValue({ status: 'ok', copilotMode: 'live', authMode: 'demo' });
  mockedApi.listBoards.mockResolvedValue([
    { id: 'board-default', name: '전체', createdAt: 'x', shareId: null },
  ]);
  mockedApi.listCards.mockResolvedValue([]);
});

describe('App', () => {
  it('보드 목록과 Copilot 배지 로드', async () => {
    render(<App />);
    expect(await screen.findByText('전체')).toBeInTheDocument();
    expect(await screen.findByText(/LIVE/)).toBeInTheDocument();
  });

  it('라이브 모드 비로그인 시 로그인 화면 표시', async () => {
    mockedApi.me.mockResolvedValue({ user: null, authMode: 'live' });
    render(<App />);
    expect(await screen.findByText(/GitHub 로 로그인/)).toBeInTheDocument();
    expect(mockedApi.listBoards).not.toHaveBeenCalled();
  });

  it('로그인 사용자 이름 표시', async () => {
    mockedApi.me.mockResolvedValue({
      user: { ...DEMO_USER, id: 'github:1', provider: 'github', login: 'alice', name: 'Alice' },
      authMode: 'live',
    });
    render(<App />);
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
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

  it('카드 생성 중 스켈레톤(아웃라인) 표시 후 완료 시 실제 카드로 교체', async () => {
    let resolveFn: (c: Card) => void = () => {};
    mockedApi.createCardFromUrl.mockReturnValue(
      new Promise<Card>((resolve) => {
        resolveFn = resolve;
      }),
    );
    render(<App />);
    await screen.findByText('전체');

    await userEvent.type(screen.getByLabelText('링크 입력'), 'https://x.com');
    await userEvent.click(screen.getByRole('button', { name: /카드 만들기/ }));

    // 생성 중: 스켈레톤 + "요약 생성 중…" 표시, 버튼 비활성
    expect(await screen.findByTestId('card-skeleton')).toBeInTheDocument();
    expect(screen.getByText('요약 생성 중…')).toBeInTheDocument();
    expect(screen.getByText('https://x.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /카드 생성 중/ })).toBeDisabled();

    // 완료: 스켈레톤 사라지고 실제 카드 표시
    resolveFn(makeCard({ title: '완성된 카드' }));
    expect(await screen.findByText('완성된 카드')).toBeInTheDocument();
    expect(screen.queryByTestId('card-skeleton')).not.toBeInTheDocument();
  });

  it('카드 생성 실패 시 스켈레톤 제거 + 에러 표시', async () => {
    let rejectFn: (e: unknown) => void = () => {};
    mockedApi.createCardFromUrl.mockReturnValue(
      new Promise<Card>((_resolve, reject) => {
        rejectFn = reject;
      }),
    );
    render(<App />);
    await screen.findByText('전체');

    await userEvent.type(screen.getByLabelText('링크 입력'), 'https://x.com');
    await userEvent.click(screen.getByRole('button', { name: /카드 만들기/ }));

    expect(await screen.findByTestId('card-skeleton')).toBeInTheDocument();

    rejectFn(new Error('추출 실패'));
    expect(await screen.findByRole('alert')).toHaveTextContent('추출 실패');
    expect(screen.queryByTestId('card-skeleton')).not.toBeInTheDocument();
  });

  it('AI 도우미 토글로 패널 표시', async () => {
    render(<App />);
    await screen.findByText('전체');
    await userEvent.click(screen.getByText('🤖 AI 도우미'));
    expect(screen.getByRole('region', { name: 'AI 도우미' })).toBeInTheDocument();
  });

  it('공유 버튼 클릭 → 공유 링크 표시', async () => {
    mockedApi.shareBoard.mockResolvedValue({
      board: { id: 'board-default', name: '전체', createdAt: 'x', shareId: 'tok123' },
      shareId: 'tok123',
    });
    render(<App />);
    await screen.findByText('전체');

    await userEvent.click(screen.getByRole('button', { name: '보드 공유' }));

    expect(mockedApi.shareBoard).toHaveBeenCalledWith('board-default');
    const link = (await screen.findByLabelText('공유 링크')) as HTMLInputElement;
    expect(link.value).toContain('?share=tok123');
    expect(screen.getByRole('button', { name: '공유 중지' })).toBeInTheDocument();
  });
});
