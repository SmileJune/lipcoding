import { useState, type FormEvent } from 'react';
import type { Card, Insight, OrganizeGroup } from '../types';

interface Props {
  cards: Card[];
  groups: OrganizeGroup[];
  insights: Insight[];
  answer: string;
  busy: boolean;
  onOrganize: () => void;
  onInsights: () => void;
  onAsk: (question: string) => void;
  onClose: () => void;
}

const INSIGHT_META: Record<Insight['kind'], { icon: string; label: string }> = {
  connection: { icon: '🔗', label: '연결' },
  tension: { icon: '⚡', label: '긴장' },
  gap: { icon: '🕳️', label: '빈틈' },
  question: { icon: '💡', label: '다음 질문' },
};

export function AiPanel({
  cards,
  groups,
  insights,
  answer,
  busy,
  onOrganize,
  onInsights,
  onAsk,
  onClose,
}: Props) {
  const [question, setQuestion] = useState('');

  function ask(e: FormEvent) {
    e.preventDefault();
    const value = question.trim();
    if (!value) return;
    onAsk(value);
  }

  const titleById = new Map(cards.map((c) => [c.id, c.title]));

  return (
    <section className="ai-panel" aria-label="AI 도우미">
      <header className="ai-header">
        <h2>AI 도우미</h2>
        <button className="ai-close" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </header>

      <div className="ai-section">
        <button className="ai-organize" onClick={onOrganize} disabled={busy}>
          🧩 이 보드 정리하기
        </button>
        {groups.length > 0 && (
          <ul className="ai-groups">
            {groups.map((g, i) => (
              <li key={i}>
                <strong>{g.label}</strong>
                <span className="group-cards">
                  {g.cardIds.map((id) => titleById.get(id) ?? id).join(', ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="ai-section">
        <button className="ai-organize ai-insights-btn" onClick={onInsights} disabled={busy}>
          🔮 연결 인사이트 발견
        </button>
        <p className="ai-hint">카드를 가로질러 연결·긴장·빈틈·다음 질문을 찾아드려요.</p>
        {insights.length > 0 && (
          <ul className="ai-insights">
            {insights.map((it, i) => {
              const meta = INSIGHT_META[it.kind];
              return (
                <li key={i} className={`insight insight-${it.kind}`}>
                  <span className="insight-kind">
                    {meta.icon} {meta.label}
                  </span>
                  <strong className="insight-title">{it.title}</strong>
                  <span className="insight-detail">{it.detail}</span>
                  {it.cardIds.length > 0 && (
                    <span className="group-cards">
                      {it.cardIds.map((id) => titleById.get(id) ?? id).join(', ')}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="ai-section">
        <form className="ai-chat" onSubmit={ask}>
          <input
            type="text"
            placeholder="이 보드에 대해 질문하기…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            aria-label="질문 입력"
          />
          <button type="submit" disabled={busy || !question.trim()}>
            질문
          </button>
        </form>
        {answer && <p className="ai-answer">{answer}</p>}
      </div>
    </section>
  );
}
