import { useEffect, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Card, CardColor } from '../types';
import { CARD_COLORS } from '../types';

interface Props {
  card: Card;
  onMemoCommit: (id: string, memo: string) => void;
  onColorChange: (id: string, color: CardColor) => void;
  onDelete: (id: string) => void;
}

export function CardItem({ card, onMemoCommit, onColorChange, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
  });
  const [memo, setMemo] = useState(card.memo);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // 외부에서 카드가 바뀌면 메모 동기화
  useEffect(() => {
    setMemo(card.memo);
  }, [card.memo]);

  const style: React.CSSProperties = {
    left: card.posX,
    top: card.posY,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    zIndex: isDragging ? 100 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      className={`card card-${card.color}`}
      style={style}
      data-testid={`card-${card.id}`}
    >
      <div className="card-drag" {...listeners} {...attributes} aria-label="카드 이동 핸들">
        ⠿
      </div>

      {card.imageUrl && (
        <img
          className="card-image"
          src={card.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}

      <a className="card-title" href={card.sourceUrl} target="_blank" rel="noreferrer">
        {card.title}
      </a>
      <p className="card-summary">{card.summary}</p>

      {card.keyPoints.length > 0 && (
        <ul className="card-points">
          {card.keyPoints.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}

      {card.tags.length > 0 && (
        <div className="card-tags">
          {card.tags.map((t) => (
            <span key={t} className="tag">
              #{t}
            </span>
          ))}
        </div>
      )}

      <textarea
        className="card-memo"
        placeholder="메모를 남겨보세요…"
        value={memo}
        aria-label="메모"
        onChange={(e) => setMemo(e.target.value)}
        onBlur={() => {
          if (memo !== card.memo) onMemoCommit(card.id, memo);
        }}
      />

      <div className="card-actions">
        <div className="color-picker" role="group" aria-label="색상 선택">
          {CARD_COLORS.map((c) => (
            <button
              key={c}
              className={`swatch swatch-${c}${c === card.color ? ' selected' : ''}`}
              aria-label={`색상 ${c}`}
              onClick={() => onColorChange(card.id, c)}
            />
          ))}
        </div>
        {confirmingDelete ? (
          <div className="confirm-inline" role="group" aria-label="카드 삭제 확인">
            <button
              className="confirm-yes"
              onClick={() => {
                setConfirmingDelete(false);
                onDelete(card.id);
              }}
              aria-label="삭제 확인"
            >
              삭제
            </button>
            <button
              className="confirm-no"
              onClick={() => setConfirmingDelete(false)}
              aria-label="삭제 취소"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            className="card-delete"
            onClick={() => setConfirmingDelete(true)}
            aria-label="카드 삭제"
          >
            🗑
          </button>
        )}
      </div>
    </div>
  );
}
