import type { CSSProperties } from 'react';

interface Props {
  url: string;
  style?: CSSProperties;
}

/** 카드 생성(요약) 중에 보여주는 자리표시 아웃라인. */
export function CardSkeleton({ url, style }: Props) {
  return (
    <div
      className="card card-skeleton"
      style={style}
      data-testid="card-skeleton"
      role="status"
      aria-busy="true"
      aria-label="카드 생성 중"
    >
      <div className="skeleton-head">
        <span className="skeleton-spinner" aria-hidden="true" />
        <span className="skeleton-status">요약 생성 중…</span>
      </div>

      <div className="skeleton-thumb skeleton-shimmer" />
      <div className="skeleton-line skeleton-line-title skeleton-shimmer" />
      <div className="skeleton-line skeleton-shimmer" />
      <div className="skeleton-line skeleton-line-short skeleton-shimmer" />

      <div className="skeleton-tags">
        <span className="skeleton-tag skeleton-shimmer" />
        <span className="skeleton-tag skeleton-shimmer" />
      </div>

      <div className="skeleton-url" title={url}>
        {url}
      </div>
    </div>
  );
}
