import { useState, type FormEvent } from 'react';

interface Props {
  onSubmit: (url: string) => void;
  busy: boolean;
}

export function LinkInput({ onSubmit, busy }: Props) {
  const [url, setUrl] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = url.trim();
    if (!value) return;
    onSubmit(value);
    setUrl('');
  }

  return (
    <form className="link-input" onSubmit={submit}>
      <input
        type="url"
        placeholder="링크를 붙여넣으세요 (https://...)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        aria-label="링크 입력"
      />
      <button type="submit" disabled={busy || !url.trim()}>
        {busy ? '카드 생성 중…' : '+ 카드 만들기'}
      </button>
    </form>
  );
}
