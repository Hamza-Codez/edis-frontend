import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger';
type Size = 'md' | 'sm';

type Base = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
};

/**
 * A button either has visible text, or it has an icon and an explicit
 * aria-label. The union makes that a compile error rather than something
 * `tests/accessible-names.test.tsx` has to catch after the fact — an icon-only
 * control announces as nothing at all, and the test can only find it once the
 * screen exists.
 */
export type ButtonProps = Base &
  ({ children: ReactNode } | { children?: never; icon: ReactNode; 'aria-label': string });

// spec07 §3: buttons and inputs sit on the `sm` radius step; `md` is for cards.
const BASE =
  'inline-flex items-center justify-center gap-2 rounded-sm font-medium ' +
  'focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-canvas focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

// §1 Q3 density: controls are 36-40px. h-10 is 40, h-9 is 36.
const SIZES: Record<Size, string> = {
  md: 'h-10 px-5 text-sm',
  sm: 'h-9 px-3 text-xs',
};

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-text-on-accent hover:bg-accent-hover',
  secondary: 'border border-control-border bg-control text-text hover:bg-control-hover',
  quiet: 'text-text-muted hover:bg-control hover:text-text',
  danger: 'text-danger hover:bg-danger/10',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
