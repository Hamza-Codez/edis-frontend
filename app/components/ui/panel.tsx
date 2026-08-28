import type { ReactNode } from 'react';

/**
 * The one container. Every rail block, result card and grouped list is a Panel,
 * which is what stops six screens each inventing their own card.
 *
 * Radius is `md` — spec07 §3 puts cards on the md step and the permitted
 * maximum. No shadow: §3 reserves those for things that float, and nothing here
 * does. Separation comes from the border and the structure-toned header.
 */
export function Panel({
  title,
  hint,
  action,
  bodyClassName = 'p-4',
  className = '',
  children,
}: {
  title?: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  bodyClassName?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`overflow-hidden rounded-md border border-border bg-surface ${className}`}>
      {(title || action) && (
        <header className="flex items-baseline justify-between gap-3 border-b border-accent bg-accent px-4 py-2.5">
          <div className="min-w-0">
            {title && (
              <h2 className="font-space-grotesk text-sm font-bold text-text-on-accent">{title}</h2>
            )}
            {hint && <p className="mt-0.5 text-xs leading-snug text-text-on-accent/80">{hint}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
