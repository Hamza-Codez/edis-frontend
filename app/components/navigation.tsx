'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/lib/labels';

export function Navigation({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <>
      {items.map(({ href, label }) => {
        // Active if exact match or if it's a child route (except for Dashboard '/')
        const isActive = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            className={`block px-3 py-2 text-sm rounded-sm font-medium transition-colors ${
              isActive
                ? 'bg-chrome-hover text-chrome-text'
                : 'text-chrome-text hover:bg-chrome-hover/50'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
