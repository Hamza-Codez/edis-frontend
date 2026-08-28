'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function Accordion({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`divide-y divide-border border-t border-border ${className}`}>
      {children}
    </div>
  );
}

export function AccordionItem({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-canvas">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-structure/50 focus:bg-structure/50 focus:outline-none"
      >
        <div className="min-w-0 pr-4">
          <p className="truncate text-sm font-medium text-text">{title}</p>
          {subtitle && <p className="truncate text-xs text-text-muted mt-0.5">{subtitle}</p>}
        </div>
        <div className="shrink-0 text-text-muted">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>
      {isOpen && (
        <div className="border-t border-border bg-structure/30 px-4 py-3">
          {children}
        </div>
      )}
    </div>
  );
}
