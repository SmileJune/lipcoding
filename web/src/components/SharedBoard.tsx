// 공개 공유 보드 보기 (읽기 전용). URL `?share=<shareId>` 로 진입.
import { useEffect, useState } from 'react';
import { api } from '../api';
import type { SharedBoardView } from '../types';

interface Props {
  shareId: string;
}

export function SharedBoard({ shareId }: Props) {
  const [view, setView] = useState<SharedBoardView | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api
      .getSharedBoard(shareId)
      .then((v) => {
        if (alive) setView(v);
      })
      .catch((e: unknown) => {
        if (alive) {
          setError(e instanceof Error ? e.message : '공유 보드를 불러올 수 없습니다.');
        }
      });
    return () => {
      alive = false;
    };
  }, [shareId]);

  if (error) {
    return (
      <div className="shared-page">
        <div className="shared-empty">
          <div className="brand">Curio</div>
          <p>{error}</p>
          <a className="shared-cta" href="/">
            Curio 홈으로
          </a>
        </div>
      </div>
    );
  }

  if (!view) {
    return <div className="app-loading">불러오는 중…</div>;
  }

  return (
    <div className="shared-page">
      <header className="shared-header">
        <div className="shared-header-left">
          <a className="brand" href="/">
            Curio
          </a>
          <div className="shared-title">
            <h1>{view.board.name}</h1>
            {view.owner && (
              <span className="shared-owner">
                {view.owner.avatarUrl && (
                  <img src={view.owner.avatarUrl} alt="" width={20} height={20} />
                )}
                {view.owner.name} 님의 공유 보드
              </span>
            )}
          </div>
        </div>
        <a className="shared-cta" href="/">
          나도 Curio 시작하기
        </a>
      </header>

      <div className="board-canvas shared-canvas" data-testid="shared-canvas">
        {view.cards.length === 0 ? (
          <p className="empty">아직 카드가 없는 보드입니다.</p>
        ) : (
          view.cards.map((card) => (
            <article
              key={card.id}
              className={`card card-${card.color}`}
              style={{ left: card.posX, top: card.posY }}
              data-testid={`shared-card-${card.id}`}
            >
              {card.imageUrl && (
                <img
                  className="card-image"
                  src={card.imageUrl}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
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
              {card.memo && <p className="card-memo-readonly">{card.memo}</p>}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
