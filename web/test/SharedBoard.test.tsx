import { render, screen } from '@testing-library/react';
import { SharedBoard } from '../src/components/SharedBoard';
import { api } from '../src/api';
import type { Card, SharedBoardView } from '../src/types';

vi.mock('../src/api', () => ({
  api: { getSharedBoard: vi.fn() },
}));

const mockedApi = api as unknown as { getSharedBoard: ReturnType<typeof vi.fn> };

function makeCard(over: Partial<Card>): Card {
  return {
    id: 'card-1',
    boardId: 'b1',
    sourceUrl: 'https://x.com',
    title: '카드',
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

beforeEach(() => vi.clearAllMocks());

describe('SharedBoard', () => {
  it('공유 보드 이름·카드·소유자 표시', async () => {
    mockedApi.getSharedBoard.mockResolvedValue({
      board: { id: 'b1', name: '여행 보드' },
      owner: { name: 'Alice', avatarUrl: null },
      cards: [makeCard({ id: 'card-1', title: '제주도 명소', tags: ['여행'] })],
    } satisfies SharedBoardView);

    render(<SharedBoard shareId="tok" />);

    expect(await screen.findByText('여행 보드')).toBeInTheDocument();
    expect(screen.getByText('제주도 명소')).toBeInTheDocument();
    expect(screen.getByText('#여행')).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(mockedApi.getSharedBoard).toHaveBeenCalledWith('tok');
  });

  it('읽기 전용: 편집 컨트롤 없음', async () => {
    mockedApi.getSharedBoard.mockResolvedValue({
      board: { id: 'b1', name: '보드' },
      owner: null,
      cards: [makeCard({ id: 'card-1', memo: '내 메모' })],
    } satisfies SharedBoardView);

    render(<SharedBoard shareId="tok" />);
    await screen.findByText('보드');

    expect(screen.queryByLabelText('메모')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('카드 삭제')).not.toBeInTheDocument();
    expect(screen.getByText('내 메모')).toBeInTheDocument();
  });

  it('카드 없으면 빈 메시지', async () => {
    mockedApi.getSharedBoard.mockResolvedValue({
      board: { id: 'b1', name: '빈 보드' },
      owner: null,
      cards: [],
    } satisfies SharedBoardView);

    render(<SharedBoard shareId="tok" />);

    expect(await screen.findByText('빈 보드')).toBeInTheDocument();
    expect(screen.getByText(/아직 카드가 없는/)).toBeInTheDocument();
  });

  it('에러 시 메시지 + 홈 링크', async () => {
    mockedApi.getSharedBoard.mockRejectedValue(new Error('공유 보드를 찾을 수 없습니다.'));

    render(<SharedBoard shareId="bad" />);

    expect(await screen.findByText('공유 보드를 찾을 수 없습니다.')).toBeInTheDocument();
    expect(screen.getByText('Curio 홈으로')).toBeInTheDocument();
  });

  it('썸네일은 referrerPolicy=no-referrer 로 hotlink 차단 우회', async () => {
    mockedApi.getSharedBoard.mockResolvedValue({
      board: { id: 'b1', name: '보드' },
      owner: null,
      cards: [makeCard({ id: 'card-1', imageUrl: 'https://regexr.com/assets/card.png' })],
    } satisfies SharedBoardView);

    const { container } = render(<SharedBoard shareId="tok" />);
    await screen.findByText('보드');
    const img = container.querySelector('img.card-image') as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img?.getAttribute('referrerpolicy')).toBe('no-referrer');
  });
});
