import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext } from '@dnd-kit/core';
import { CardItem } from '../src/components/CardItem';
import type { Card } from '../src/types';

const baseCard: Card = {
  id: 'card-1',
  boardId: 'b1',
  sourceUrl: 'https://x.com',
  title: '제목',
  summary: '요약문',
  keyPoints: ['포인트1', '포인트2'],
  tags: ['tag1'],
  memo: '',
  color: 'default',
  posX: 0,
  posY: 0,
  imageUrl: null,
  status: 'ready',
  createdAt: 'x',
  updatedAt: 'x',
};

function renderCard(card: Card = baseCard) {
  const handlers = {
    onMemoCommit: vi.fn(),
    onColorChange: vi.fn(),
    onDelete: vi.fn(),
  };
  const utils = render(
    <DndContext>
      <CardItem card={card} {...handlers} />
    </DndContext>,
  );
  return { ...handlers, ...utils };
}

describe('CardItem', () => {
  it('제목/요약/핵심포인트/태그 렌더', () => {
    renderCard();
    expect(screen.getByText('제목')).toBeInTheDocument();
    expect(screen.getByText('요약문')).toBeInTheDocument();
    expect(screen.getByText('포인트1')).toBeInTheDocument();
    expect(screen.getByText('#tag1')).toBeInTheDocument();
  });

  it('메모 입력 후 blur 시 commit', async () => {
    const h = renderCard();
    await userEvent.type(screen.getByLabelText('메모'), '내 메모');
    await userEvent.tab();
    expect(h.onMemoCommit).toHaveBeenCalledWith('card-1', '내 메모');
  });

  it('색상 클릭 시 onColorChange', async () => {
    const h = renderCard();
    await userEvent.click(screen.getByLabelText('색상 yellow'));
    expect(h.onColorChange).toHaveBeenCalledWith('card-1', 'yellow');
  });

  it('삭제 클릭 시 onDelete', async () => {
    const h = renderCard();
    await userEvent.click(screen.getByLabelText('카드 삭제'));
    expect(h.onDelete).toHaveBeenCalledWith('card-1');
  });

  it('imageUrl 있으면 썸네일 렌더', () => {
    const { container } = renderCard({ ...baseCard, imageUrl: 'https://cdn.example.com/x.jpg' });
    const img = container.querySelector('img.card-image') as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img?.src).toBe('https://cdn.example.com/x.jpg');
  });

  it('imageUrl 없으면 썸네일 없음', () => {
    const { container } = renderCard();
    expect(container.querySelector('img.card-image')).toBeNull();
  });
});
