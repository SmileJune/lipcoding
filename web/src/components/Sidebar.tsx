import { useState, type FormEvent } from 'react';
import type { Board, CopilotMode } from '../types';

interface Props {
  boards: Board[];
  selectedBoardId: string;
  copilotMode: CopilotMode | null;
  onSelect: (boardId: string) => void;
  onCreate: (name: string) => void;
  onToggleAi: () => void;
}

export function Sidebar({
  boards,
  selectedBoardId,
  copilotMode,
  onSelect,
  onCreate,
  onToggleAi,
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
    </aside>
  );
}
