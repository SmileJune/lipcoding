import { useCallback, useEffect, useState } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { api } from './api';
import type { Board, Card, CardColor, CopilotMode, OrganizeGroup } from './types';
import { nextPosition } from './dnd';
import { LinkInput } from './components/LinkInput';
import { Sidebar } from './components/Sidebar';
import { Board as BoardView } from './components/Board';
import { AiPanel } from './components/AiPanel';

export function App() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [copilotMode, setCopilotMode] = useState<CopilotMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [groups, setGroups] = useState<OrganizeGroup[]>([]);
  const [answer, setAnswer] = useState('');

  const showError = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
  }, []);

  // 초기 로드: health(copilot 모드) + 보드 목록
  useEffect(() => {
    api
      .health()
      .then((h) => setCopilotMode(h.copilotMode))
      .catch(() => setCopilotMode(null));
    api
      .listBoards()
      .then((bs) => {
        setBoards(bs);
        if (bs.length > 0) setSelectedBoardId((prev) => prev || bs[0].id);
      })
      .catch(showError);
  }, [showError]);

  // 선택 보드 변경 시 카드 로드
  useEffect(() => {
    if (!selectedBoardId) return;
    api.listCards(selectedBoardId).then(setCards).catch(showError);
    setGroups([]);
    setAnswer('');
  }, [selectedBoardId, showError]);

  async function addCard(url: string) {
    setBusy(true);
    setError('');
    try {
      const card = await api.createCardFromUrl(url, selectedBoardId || undefined);
      setCards((cs) => [...cs, card]);
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    const pos = nextPosition(card, e.delta);
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...pos } : c)));
    api.updateCard(id, pos).catch(showError);
  }

  function commitMemo(id: string, memo: string) {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, memo } : c)));
    api.updateCard(id, { memo }).catch(showError);
  }

  function changeColor(id: string, color: CardColor) {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, color } : c)));
    api.updateCard(id, { color }).catch(showError);
  }

  async function removeCard(id: string) {
    const prev = cards;
    setCards((cs) => cs.filter((c) => c.id !== id));
    try {
      await api.deleteCard(id);
    } catch (e) {
      setCards(prev);
      showError(e);
    }
  }

  async function createBoard(name: string) {
    try {
      const board = await api.createBoard(name);
      setBoards((bs) => [...bs, board]);
      setSelectedBoardId(board.id);
    } catch (e) {
      showError(e);
    }
  }

  async function organize() {
    if (!selectedBoardId) return;
    setBusy(true);
    try {
      const res = await api.organize(selectedBoardId);
      setGroups(res.groups);
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  async function ask(question: string) {
    setBusy(true);
    try {
      const res = await api.chat(question, selectedBoardId || undefined);
      setAnswer(res.answer);
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <Sidebar
        boards={boards}
        selectedBoardId={selectedBoardId}
        copilotMode={copilotMode}
        onSelect={setSelectedBoardId}
        onCreate={createBoard}
        onToggleAi={() => setAiOpen((v) => !v)}
      />

      <main className="main">
        <header className="topbar">
          <LinkInput onSubmit={addCard} busy={busy} />
        </header>

        {error && (
          <div className="error-toast" role="alert" onClick={() => setError('')}>
            {error}
          </div>
        )}

        <BoardView
          cards={cards}
          onDragEnd={handleDragEnd}
          onMemoCommit={commitMemo}
          onColorChange={changeColor}
          onDelete={removeCard}
        />
      </main>

      {aiOpen && (
        <AiPanel
          cards={cards}
          groups={groups}
          answer={answer}
          busy={busy}
          onOrganize={organize}
          onAsk={ask}
          onClose={() => setAiOpen(false)}
        />
      )}
    </div>
  );
}
