// 선택된 보드의 공개 공유 토글 + 링크 복사 (topbar 우측).
import { useState } from 'react';
import type { Board } from '../types';

interface Props {
  board: Board | undefined;
  onShare: (boardId: string) => void;
  onUnshare: (boardId: string) => void;
}

export function ShareBar({ board, onShare, onUnshare }: Props) {
  const [copied, setCopied] = useState(false);

  if (!board) return null;

  const shareUrl = board.shareId ? `${window.location.origin}/?share=${board.shareId}` : '';

  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 접근 거부 시 무시 (사용자가 직접 선택·복사 가능)
    }
  }

  if (!board.shareId) {
    return (
      <button className="share-btn" onClick={() => onShare(board.id)} aria-label="보드 공유">
        🔗 공유
      </button>
    );
  }

  return (
    <div className="share-bar" role="group" aria-label="공유 링크 도구">
      <input
        className="share-url"
        type="text"
        readOnly
        value={shareUrl}
        aria-label="공유 링크"
        onFocus={(e) => e.currentTarget.select()}
      />
      <button className="share-copy" onClick={copy}>
        {copied ? '복사됨' : '복사'}
      </button>
      <button className="share-stop" onClick={() => onUnshare(board.id)} aria-label="공유 중지">
        공유 중지
      </button>
    </div>
  );
}
