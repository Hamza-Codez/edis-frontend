import type { CurrentUser } from './types';

/**
 * The single module that renders role-dependent strings and visibility —
 * spec07 §1 Q5.
 *
 * **This is UX, never security.** Hiding a link keeps someone off a screen the
 * backend would refuse anyway; the backend stays authoritative and answers 404
 * for anything a caller may not see. Nothing here may be the only thing
 * standing between a user and an action.
 *
 * It exists in one place so the strings cannot drift between the sidebar, a
 * page heading and an empty state — which is how a member ends up reading "All
 * queries" above a list of only their own.
 */

export type Role = CurrentUser['role'];

export const isAdmin = (role: Role): boolean => role === 'admin';

export type NavItem = { href: string; label: string };

export function navigationFor(role: Role): NavItem[] {
  const items: NavItem[] = [
    { href: '/', label: 'Dashboard' },
    { href: '/ask', label: 'Ask' },
    { href: '/documents', label: 'Documents' },
    { href: '/search', label: 'Search' },
    { href: '/queries', label: 'Query log' },
  ];
  // Only admins get a link to /admin/users. A member who navigates there
  // directly still gets 404 from the backend, which is the actual guard.
  return isAdmin(role) ? [...items, { href: '/admin/users', label: 'Users' }] : items;
}

/** What the query log is actually showing, so the heading cannot overstate it. */
export function queryScopeLabel(role: Role): string {
  return isAdmin(role) ? 'Every question asked in this workspace.' : 'The questions you have asked.';
}

/**
 * Reading is shared across the workspace; changing a document is not.
 * Mirrors the backend rule so the UI does not offer an action that will 404.
 */
export function canModifyDocument(user: CurrentUser, uploadedBy: string): boolean {
  return isAdmin(user.role) || user.id === uploadedBy;
}
