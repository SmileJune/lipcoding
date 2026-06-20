import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import type { Card, CardColor, PendingCard } from '../types';
import { CardItem } from './CardItem';
import { CardSkeleton } from './CardSkeleton';

interface Props {
  cards: Card[];
  pending?: PendingCard[];
  onDragEnd: (e: DragEndEvent) => void;
  onMemoCommit: (id: string, memo: string) => void;
  onColorChange: (id: string, color: CardColor) => void;
  onDelete: (id: string) => void;
}

export function Board({
  cards,
  pending = [],
  onDragEnd,
  onMemoCommit,
  onColorChange,
  onDelete,
}: Props) {
  const isEmpty = cards.length === 0 && pending.length === 0;
  return (
    <DndContext onDragEnd={onDragEnd}>
      <div className="board-canvas" data-testid="board-canvas">
        {isEmpty ? (
          <p className="empty">링크를 붙여넣어 첫 카드를 만들어 보세요. 📎</p>
        ) : (
          <>
            {cards.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                onMemoCommit={onMemoCommit}
                onColorChange={onColorChange}
                onDelete={onDelete}
              />
            ))}
            {pending.map((p, i) => (
              <CardSkeleton
                key={p.id}
                url={p.url}
                style={{ left: 16 + i * 20, top: 16 + i * 20 }}
              />
            ))}
          </>
        )}
      </div>
    </DndContext>
  );
}
