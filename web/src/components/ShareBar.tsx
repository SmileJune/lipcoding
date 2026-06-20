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
  const [confirmingShare, setConfirmingShare] = useState(false);

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
    // 공개 공유는 보드 내용을 누구나 볼 수 있게 하므로 확인 단계를 거친다.
    if (confirmingShare) {
      return (
        <div className="share-confirm" role="group" aria-label="공개 공유 확인 요청">
          <span className="share-warn">링크가 있는 누구나 이 보드를 볼 수 있습니다. 공개할까요?</span>
          <button
            className="share-yes"
            onClick={() => {
              setConfirmingShare(false);
              onShare(board.id);
            }}
            aria-label="공개 공유 확인"
          >
            공개 공유
          </button>
          <button
            className="share-no"
            onClick={() => setConfirmingShare(false)}
            aria-label="공개 공유 취소"
          >
            취소
          </button>
        </div>
      );
    }
    return (
      <button
        className="share-btn"
        onClick={() => setConfirmingShare(true)}
        aria-label="보드 공유"
      >
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
