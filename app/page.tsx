import Link from 'next/link';
import { FileText, MessageCircleQuestion, Search, UploadCloud } from 'lucide-react';
import { getCurrentUser } from '@/lib/session';
import { CorpusSummary } from './components/corpus-summary';

export const metadata = { title: 'EDIS' };

const ACTIONS = [
  {
    href: '/ask',
    icon: MessageCircleQuestion,
    title: 'Ask a question',
    body: 'Get an answer assembled only from indexed documents, with every sentence traced to the passage it came from.',
  },
  {
    href: '/documents',
    icon: UploadCloud,
    title: 'Add documents',
    body: 'Upload a PDF or DOCX. Text is extracted, split and embedded before it becomes answerable.',
  },
  {
    href: '/search',
    icon: Search,
    title: 'Inspect retrieval',
    body: 'See the raw passages a question retrieves, and how strongly each one matched. Diagnostic, not an answer.',
  },
];

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      <header className="space-y-1">
        <h1 className="font-space-grotesk text-2xl font-bold text-heading">
          {user ? `Welcome back, ${user.email.split('@')[0]}` : 'Enterprise Document Intelligence'}
        </h1>
        <p className="text-sm text-text-muted">
          Ask questions across your document corpus and get answers you can check.
        </p>
      </header>

      <CorpusSummary />

      <section className="grid gap-4 sm:grid-cols-3">
        {ACTIONS.map(({ href, icon: Icon, title, body }) => (
          <Link
            key={href}
            href={href}
            className="card-maroon group flex flex-col gap-2 rounded-md border border-card-border p-5 text-chrome-text hover:border-chrome-text/40 focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-canvas focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <Icon size={20} className="text-chrome-text" />
              <span className="font-space-grotesk font-bold text-chrome-text">{title}</span>
            </div>
            <span className="text-sm leading-relaxed text-chrome-text-muted">{body}</span>
          </Link>
        ))}
      </section>

      <section className="rounded-md border border-border bg-structure/50 p-5">
        <h2 className="mb-2 flex items-center gap-2 font-space-grotesk font-bold text-text">
          <FileText size={16} className="text-text-muted" />
          How answers are produced
        </h2>
        {/* Stated plainly because it is the product's whole claim, and because a
            user who does not know a refusal is deliberate reads it as a fault. */}
        <ol className="space-y-1.5 text-sm leading-relaxed text-text-muted">
          <li>1. Your question is matched against every indexed passage.</li>
          <li>
            2. If nothing matches strongly enough, the system says so and stops. It will not
            guess.
          </li>
          <li>3. Otherwise the best passages are summarised, and every claim must cite one.</li>
          <li>4. Any answer that cites something it was not given is discarded, not repaired.</li>
        </ol>
      </section>
    </div>
  );
}
