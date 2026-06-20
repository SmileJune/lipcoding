import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareBar } from '../src/components/ShareBar';
import type { Board } from '../src/types';

const board: Board = { id: 'b1', name: '보드', createdAt: 'x', shareId: null };

function setup(b: Board = board) {
  const onShare = vi.fn();
  const onUnshare = vi.fn();
  render(<ShareBar board={b} onShare={onShare} onUnshare={onUnshare} />);
  return { onShare, onUnshare };
}

describe('ShareBar', () => {
  it('공개 공유는 확인 단계를 거쳐 onShare 호출', async () => {
    const { onShare } = setup();
    await userEvent.click(screen.getByLabelText('보드 공유'));
    expect(onShare).not.toHaveBeenCalled(); // 첫 클릭은 확인만 노출
    await userEvent.click(screen.getByLabelText('공개 공유 확인'));
    expect(onShare).toHaveBeenCalledWith('b1');
  });

  it('공개 공유 취소 시 onShare 미호출 + 원래 버튼 복귀', async () => {
    const { onShare } = setup();
    await userEvent.click(screen.getByLabelText('보드 공유'));
    await userEvent.click(screen.getByLabelText('공개 공유 취소'));
    expect(onShare).not.toHaveBeenCalled();
    expect(screen.getByLabelText('보드 공유')).toBeInTheDocument();
  });

  it('이미 공유 중이면 링크·복사·공유 중지 노출', () => {
    setup({ ...board, shareId: 'tok123' });
    expect(screen.getByLabelText('공유 링크')).toBeInTheDocument();
    expect(screen.getByLabelText('공유 중지')).toBeInTheDocument();
  });
});
