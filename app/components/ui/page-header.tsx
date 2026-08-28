import type { ReactNode } from 'react';

/**
 * One page header. Six existed, differing in heading size, subtitle size and
 * bottom margin — /search's subtitle was full-size where every other page used
 * text-sm.
 */
export function PageHeader({
  title,
  description,
  children,
  className = '',
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`flex items-start justify-between gap-6 ${className}`}>
      <div className="min-w-0 space-y-1">
        <h1 className="font-space-grotesk text-2xl font-bold text-heading">{title}</h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-text-muted">{description}</p>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </header>
  );
}
