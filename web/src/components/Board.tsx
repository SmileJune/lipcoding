import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import type { Card, CardColor } from '../types';
import { CardItem } from './CardItem';

interface Props {
  cards: Card[];
  onDragEnd: (e: DragEndEvent) => void;
  onMemoCommit: (id: string, memo: string) => void;
  onColorChange: (id: string, color: CardColor) => void;
  onDelete: (id: string) => void;
}

export function Board({ cards, onDragEnd, onMemoCommit, onColorChange, onDelete }: Props) {
  return (
    <DndContext onDragEnd={onDragEnd}>
      <div className="board-canvas" data-testid="board-canvas">
        {cards.length === 0 ? (
          <p className="empty">링크를 붙여넣어 첫 카드를 만들어 보세요. 📎</p>
        ) : (
          cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onMemoCommit={onMemoCommit}
              onColorChange={onColorChange}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </DndContext>
  );
}
