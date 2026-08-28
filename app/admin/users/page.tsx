'use client';

import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import type { ManagedUser } from '@/lib/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('member');

  const load = async () => {
    try {
      setUsers(await fetchApi<ManagedUser[]>('/users'));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load users.');
    }
  };

  useEffect(() => {
    // Resolved through a promise rather than an awaited call in the effect body,
    // so the state update happens after the effect returns.
    let cancelled = false;
    fetchApi<ManagedUser[]>('/users')
      .then((data) => !cancelled && setUsers(data))
      .catch((e: unknown) =>
        !cancelled && setError(e instanceof Error ? e.message : 'Could not load users.')
      );
    return () => {
      cancelled = true;
    };
  }, []);

  const act = async (fn: () => Promise<unknown>, success?: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      if (success) setNotice(success);
      await load();
    } catch (e: unknown) {
      // Rendered in full, never truncated to a toast. The backend refusal for a
      // user with history names deactivation as the remedy, and that sentence is
      // the only useful part of the message.
      setError(e instanceof Error ? e.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  };

  const createUser = (e: React.FormEvent) => {
    e.preventDefault();
    void act(
      () =>
        fetchApi('/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role }),
        }),
      `Created ${email}.`
    ).then(() => {
      setEmail('');
      setPassword('');
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <header className="space-y-1">
        <h1 className="font-space-grotesk text-2xl font-bold text-text">Users</h1>
        <p className="text-sm text-text-muted">
          Everyone can read and question the whole corpus. Only admins manage users, and only an
          uploader or an admin can remove a document.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3 text-sm leading-relaxed text-danger">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-md border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
          {notice}
        </div>
      )}

      <form
        onSubmit={createUser}
        className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-structure p-4"
      >
        <Labelled label="Email" className="min-w-52 flex-1">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-canvas px-3 text-text focus:ring-2 focus:ring-accent focus:outline-none"
          />
        </Labelled>
        <Labelled label="Password" className="min-w-44 flex-1">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-canvas px-3 text-text focus:ring-2 focus:ring-accent focus:outline-none"
          />
        </Labelled>
        <Labelled label="Role">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-10 rounded-md border border-border bg-canvas px-3 text-text focus:ring-2 focus:ring-accent focus:outline-none"
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
        </Labelled>
        <button
          type="submit"
          disabled={busy}
          className="flex h-10 items-center gap-2 rounded-md bg-accent px-4 font-medium text-text-on-accent hover:bg-accent-hover disabled:opacity-50"
        >
          <UserPlus size={16} /> Add
        </button>
      </form>

      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-structure text-left text-xs text-text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {!users && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {users?.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2 text-text">{u.email}</td>
                <td className="px-4 py-2 text-text-muted">{u.role}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      u.is_active ? 'bg-success/10 text-success' : 'bg-control text-text-muted'
                    }`}
                  >
                    {u.is_active ? 'active' : 'deactivated'}
                  </span>
                </td>
                <td className="space-x-3 px-4 py-2 text-right">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () =>
                          fetchApi(`/users/${u.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ is_active: !u.is_active }),
                          }),
                        `${u.is_active ? 'Deactivated' : 'Reactivated'} ${u.email}.`
                      )
                    }
                    className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
                  >
                    {u.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                  {/* Present, and expected to fail for anyone with history. The
                      refusal is the point: it names deactivation as the remedy. */}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () => fetchApi(`/users/${u.id}`, { method: 'DELETE' }),
                        `Deleted ${u.email}.`
                      )
                    }
                    className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Labelled({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-text-muted">{label}</span>
      {children}
    </label>
  );
}
