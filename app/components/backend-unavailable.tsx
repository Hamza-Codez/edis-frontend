import { AlertCircle } from 'lucide-react';

/**
 * Shown when the session cookie is present but the identity could not be
 * established for an infrastructure reason — the API unreachable from the
 * server, API_ORIGIN missing from the runtime, or a 5xx from /auth/me.
 *
 * It deliberately replaces the whole shell. Rendering the application chrome
 * would need a role we do not have, and guessing one would show a member the
 * admin navigation or hide it from an admin. Rendering the bare page instead —
 * which is what used to happen — leaves a signed-in user on a page with no
 * navigation and no explanation, which reads as the app being broken rather
 * than the backend being down.
 *
 * The specific cause is logged server-side and never rendered: it can name
 * internal hosts. What is on screen is the remedy, per the rule that a refusal
 * names what to do rather than quoting a code.
 *
 * This is content, not a region: layout.tsx supplies the single scrolling
 * <main>, so a second one here would make two.
 */
export function BackendUnavailable() {
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-md border border-border bg-surface p-6">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 shrink-0 rounded-sm bg-warning-surface p-2 text-warning-strong">
            <AlertCircle size={20} aria-hidden="true" />
          </div>
          <div className="space-y-3">
            <h1 className="font-space-grotesk text-lg font-bold text-heading">
              You are signed in, but the API is not answering
            </h1>
            <p className="text-sm leading-relaxed text-text-muted">
              Your session is intact — this is not a sign-in problem, so signing in again
              will not change it. The application could not reach its backend to confirm
              who you are, so the navigation is hidden rather than shown with the wrong
              permissions.
            </p>
            <p className="text-sm leading-relaxed text-text-muted">
              Check that the API is running and that <code className="font-mono">API_ORIGIN</code>{' '}
              is set in this deployment&rsquo;s server environment, then reload. If you run the
              backend yourself, its <code className="font-mono">/health</code> and{' '}
              <code className="font-mono">/health/db</code> endpoints will say which part is
              down. The exact cause is in this server&rsquo;s logs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
