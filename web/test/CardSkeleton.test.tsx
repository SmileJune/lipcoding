import { render, screen } from '@testing-library/react';
import { CardSkeleton } from '../src/components/CardSkeleton';

describe('CardSkeleton', () => {
  it('생성 중 상태 텍스트와 URL 표시', () => {
    render(<CardSkeleton url="https://example.com/article" />);
    expect(screen.getByText('요약 생성 중…')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/article')).toBeInTheDocument();
  });

  it('접근성: role=status, aria-busy 설정', () => {
    render(<CardSkeleton url="https://x.com" />);
    const el = screen.getByTestId('card-skeleton');
    expect(el).toHaveAttribute('aria-busy', 'true');
    expect(el).toHaveAttribute('role', 'status');
    expect(el).toHaveAttribute('aria-label', '카드 생성 중');
  });

  it('전달한 위치 스타일 적용', () => {
    render(<CardSkeleton url="https://x.com" style={{ left: 36, top: 36 }} />);
    const el = screen.getByTestId('card-skeleton');
    expect(el).toHaveStyle({ left: '36px', top: '36px' });
  });
});
