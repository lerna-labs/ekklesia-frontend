import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import BallotBadge from './BallotBadge.svelte';

describe('BallotBadge', () => {
  it('renders the status in upper case with live styling', () => {
    render(BallotBadge, { status: 'live' });
    const badge = screen.getByText('LIVE');
    expect(badge.className).toContain('bg-green-300');
  });

  it('uses closed styling for a closed ballot', () => {
    render(BallotBadge, { status: 'closed' });
    expect(screen.getByText('CLOSED').className).toContain('bg-red-300');
  });

  it('falls back to the upcoming styling for any other status', () => {
    render(BallotBadge, { status: 'upcoming' });
    expect(screen.getByText('UPCOMING').className).toContain('bg-slate-300');
  });
});
