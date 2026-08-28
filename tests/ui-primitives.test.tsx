/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '../app/components/ui/button';
import { ErrorBanner, EmptyState } from '../app/components/ui/feedback';
import { Stat, StatGrid } from '../app/components/ui/stat';
import { Panel } from '../app/components/ui/panel';
import { OutcomeBadge } from '../app/components/ui/outcome-badge';

describe('ui primitives', () => {
  it('an icon-only Button without an aria-label fails to type-check', () => {
    // The accessible-name rule enforced at compile time rather than only by
    // tests/accessible-names.test.tsx, which can only catch it once the control
    // is rendered on a screen someone remembered to add to that file.
    // @ts-expect-error icon-only buttons must supply aria-label
    const invalid = <Button icon={<span />} />;
    expect(invalid).toBeTruthy();
  });

  it('an icon-only Button with an aria-label is announced by that name', () => {
    render(<Button icon={<span />} aria-label="Remove policy.pdf" />);
    expect(screen.getByRole('button', { name: 'Remove policy.pdf' })).toBeInTheDocument();
  });

  it('a loading Button is disabled, so a double click cannot fire twice', () => {
    render(<Button loading>Ask</Button>);
    expect(screen.getByRole('button', { name: 'Ask' })).toBeDisabled();
  });

  it('ErrorBanner announces itself', () => {
    // Without role=alert a failure appears silently above a form the user is
    // still looking at.
    render(<ErrorBanner message="Upstream is unavailable." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Upstream is unavailable.');
  });

  it('Stat carries tabular numerals without the caller asking', () => {
    // spec07 §1 Q2. Baked in here is what stops the next figure drifting.
    render(
      <StatGrid columns={2}>
        <Stat label="Searchable" value={12} />
        <Stat label="Failed" value={0} />
      </StatGrid>
    );
    expect(screen.getByText('12').className).toContain('tabular-nums');
  });

  it('Panel renders its title as a heading so a screen has an outline', () => {
    render(
      <Panel title="In scope right now" hint="5 of 12">
        <p>body</p>
      </Panel>
    );
    expect(screen.getByRole('heading', { name: 'In scope right now' })).toBeInTheDocument();
  });

  it('EmptyState is distinguishable from an idle screen by its title', () => {
    render(<EmptyState title="No chunks matched" body="Nothing scored against that query." />);
    expect(screen.getByText('No chunks matched')).toBeInTheDocument();
  });

  it('a refusal badge is not styled as a failure', () => {
    // insufficient_context is the system working. Styled as an error it reads as
    // a fault and invites someone to weaken the gate.
    render(<OutcomeBadge outcome="insufficient_context" />);
    expect(screen.getByText('Refused').className).not.toContain('text-danger');
  });
});
