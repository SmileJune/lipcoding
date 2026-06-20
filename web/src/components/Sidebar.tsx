import { useState, type FormEvent } from 'react';
import type { AuthMode, Board, CopilotMode, User } from '../types';

interface Props {
  boards: Board[];
  selectedBoardId: string;
  copilotMode: CopilotMode | null;
  user: User;
  authMode: AuthMode;
  onSelect: (boardId: string) => void;
  onCreate: (name: string) => void;
  onToggleAi: () => void;
  onLogout: () => void;
}

export function Sidebar({
  boards,
  selectedBoardId,
  copilotMode,
  user,
  authMode,
  onSelect,
  onCreate,
  onToggleAi,
  onLogout,
}: Props) {
  const [name, setName] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;
    onCreate(value);
    setName('');
  }

  return (
    <aside className="sidebar">
      <div className="brand">Curio</div>

      <nav className="board-list" aria-label="보드 목록">
        {boards.map((b) => (
          <button
            key={b.id}
            className={`board-item${b.id === selectedBoardId ? ' active' : ''}`}
            onClick={() => onSelect(b.id)}
            aria-current={b.id === selectedBoardId}
          >
            {b.name}
          </button>
        ))}
      </nav>

      <form className="board-create" onSubmit={submit}>
        <input
          type="text"
          placeholder="새 보드 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="새 보드 이름"
        />
        <button type="submit" disabled={!name.trim()}>
          +
        </button>
      </form>

      <button className="ai-toggle" onClick={onToggleAi}>
        🤖 AI 도우미
      </button>

      {copilotMode && (
        <div className={`copilot-badge ${copilotMode}`}>
          Copilot: {copilotMode === 'live' ? 'LIVE' : '데모'}
        </div>
      )}

      <div className="user-box">
        <div className="user-info">
          {user.avatarUrl ? (
            <img className="user-avatar" src={user.avatarUrl} alt="" width={28} height={28} />
          ) : (
            <span className="user-avatar user-avatar-fallback" aria-hidden="true">
              {user.name.slice(0, 1)}
            </span>
          )}
          <span className="user-name">{user.name}</span>
        </div>
        {authMode === 'live' && (
          <button className="logout-btn" onClick={onLogout} aria-label="로그아웃">
            로그아웃
          </button>
        )}
      </div>
    </aside>
  );
}
