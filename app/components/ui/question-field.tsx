'use client';

import type { ReactNode } from 'react';

/**
 * The question input, identical on /ask and /search.
 *
 * Two of these existed before, differing in height, background and radius. They
 * are the first thing on both screens, so the divergence was visible on the two
 * pages a user is most likely to compare.
 */
export function QuestionField({
  id,
  label,
  labelHidden = false,
  value,
  onChange,
  placeholder,
  hint,
  icon,
  disabled = false,
}: {
  id: string;
  label: string;
  labelHidden?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <label
        htmlFor={id}
        className={
          labelHidden ? 'sr-only' : 'mb-1 block text-xs font-medium text-text-muted'
        }
      >
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted">
            {icon}
          </span>
        )}
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`h-10 w-full rounded-sm border border-control-border bg-surface pr-4 text-text focus:border-accent focus:ring-2 focus:ring-accent focus:outline-none disabled:opacity-50 ${
            icon ? 'pl-9' : 'pl-3'
          }`}
        />
      </div>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
