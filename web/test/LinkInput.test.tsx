import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LinkInput } from '../src/components/LinkInput';

describe('LinkInput', () => {
  it('입력 후 제출하면 onSubmit 호출 + 입력 비움', async () => {
    const onSubmit = vi.fn();
    render(<LinkInput onSubmit={onSubmit} busy={false} />);
    const input = screen.getByLabelText('링크 입력') as HTMLInputElement;
    await userEvent.type(input, 'https://example.com');
    await userEvent.click(screen.getByRole('button'));
    expect(onSubmit).toHaveBeenCalledWith('https://example.com');
    expect(input.value).toBe('');
  });

  it('busy 면 버튼 비활성', () => {
    render(<LinkInput onSubmit={vi.fn()} busy={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('빈 입력은 제출되지 않음', async () => {
    const onSubmit = vi.fn();
    render(<LinkInput onSubmit={onSubmit} busy={false} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
