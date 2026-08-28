import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './button';

/**
 * One error treatment. There were four near-copies of this — /ask, /search,
 * /queries and the document list — differing in padding and radius while saying
 * the same thing.
 *
 * `role="alert"` so a failure is announced rather than silently appearing above
 * a form the user is still looking at.
 */
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-danger/20 bg-danger/10 px-4 py-3 text-sm leading-relaxed text-danger"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <p className="min-w-0 flex-1">{message}</p>
      {onRetry && (
        <Button variant="quiet" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * The empty state, kept visually distinct from a loading state and from an
 * idle one. Conflating "nothing matched" with "nothing has happened yet" is the
 * mistake this exists to prevent — the search page already has a test for it.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border bg-structure/50 px-6 py-10 text-center">
      {icon && <span className="text-text-muted">{icon}</span>}
      <p className="font-space-grotesk font-bold text-text">{title}</p>
      {body && <p className="max-w-md text-sm leading-relaxed text-text-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** A loading placeholder shaped like the thing it stands in for. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-sm bg-structure ${className}`} />;
}
