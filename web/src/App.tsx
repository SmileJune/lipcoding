import { useCallback, useEffect, useState } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { api } from './api';
import type {
  AuthInfo,
  Board,
  Card,
  CardColor,
  CopilotMode,
  OrganizeGroup,
  PendingCard,
} from './types';
import { nextPosition } from './dnd';
import { LinkInput } from './components/LinkInput';
import { Sidebar } from './components/Sidebar';
import { Board as BoardView } from './components/Board';
import { ShareBar } from './components/ShareBar';
import { AiPanel } from './components/AiPanel';
import { LoginScreen } from './components/LoginScreen';

export function App() {
  const [auth, setAuth] = useState<AuthInfo | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [copilotMode, setCopilotMode] = useState<CopilotMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingCard[]>([]);
  const [error, setError] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [groups, setGroups] = useState<OrganizeGroup[]>([]);
  const [answer, setAnswer] = useState('');

  const showError = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
  }, []);

  // 초기: 인증 상태 + copilot 모드
  useEffect(() => {
    api
      .me()
      .then(setAuth)
      .catch(() => setAuth({ user: null, authMode: 'live' }));
    api
      .health()
      .then((h) => setCopilotMode(h.copilotMode))
      .catch(() => setCopilotMode(null));
  }, []);

  const loggedIn = Boolean(auth?.user);

  // 로그인 후 보드 목록 로드
  useEffect(() => {
    if (!loggedIn) return;
    api
      .listBoards()
      .then((bs) => {
        setBoards(bs);
        if (bs.length > 0) setSelectedBoardId((prev) => prev || bs[0].id);
      })
      .catch(showError);
  }, [loggedIn, showError]);

  // 선택 보드 변경 시 카드 로드
  useEffect(() => {
    if (!selectedBoardId) return;
    api.listCards(selectedBoardId).then(setCards).catch(showError);
    setGroups([]);
    setAnswer('');
  }, [selectedBoardId, showError]);

  async function logout() {
    try {
      await api.logout();
    } catch {
      // 무시: 어차피 로그인 화면으로 전환
    }
    setAuth({ user: null, authMode: auth?.authMode ?? 'live' });
    setBoards([]);
    setCards([]);
    setSelectedBoardId('');
  }

  async function addCard(url: string) {
    setError('');
    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setPending((ps) => [...ps, { id: tempId, url }]);
    try {
      const card = await api.createCardFromUrl(url, selectedBoardId || undefined);
      setCards((cs) => [...cs, card]);
    } catch (e) {
      showError(e);
    } finally {
      setPending((ps) => ps.filter((p) => p.id !== tempId));
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

  async function shareBoard(boardId: string) {
    try {
      const { board } = await api.shareBoard(boardId);
      setBoards((bs) => bs.map((b) => (b.id === boardId ? board : b)));
    } catch (e) {
      showError(e);
    }
  }

  async function unshareBoard(boardId: string) {
    try {
      const { board } = await api.unshareBoard(boardId);
      setBoards((bs) => bs.map((b) => (b.id === boardId ? board : b)));
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

  // 인증 로딩 중
  if (auth === null) {
    return <div className="app-loading">불러오는 중…</div>;
  }
  // 라이브 모드 비로그인 → 로그인 화면
  if (!auth.user) {
    return <LoginScreen />;
  }

  return (
    <div className="app">
      <Sidebar
        boards={boards}
        selectedBoardId={selectedBoardId}
        copilotMode={copilotMode}
        user={auth.user}
        authMode={auth.authMode}
        onSelect={setSelectedBoardId}
        onCreate={createBoard}
        onToggleAi={() => setAiOpen((v) => !v)}
        onLogout={logout}
      />

      <main className="main">
        <header className="topbar">
          <LinkInput onSubmit={addCard} busy={pending.length > 0} />
          <ShareBar
            board={boards.find((b) => b.id === selectedBoardId)}
            onShare={shareBoard}
            onUnshare={unshareBoard}
          />
        </header>

        {error && (
          <div className="error-toast" role="alert" onClick={() => setError('')}>
            {error}
          </div>
        )}

        <BoardView
          cards={cards}
          pending={pending}
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
