import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import UserManualV2 from './UserManualV2';

const manualMarkdown = `## Table of Contents

**1. Getting Started**
- [1.1: What is ETour?](#11-what-is-etour)

**3. Matches & Play**
- [3.2: Draws](#32-draws)

**4. Resolution**
- [4.6: ML1 - Match Timeout](#46-ml1---match-timeout)

**5. Anti-Griefing**
- [5.1: What's Griefing?](#51-whats-griefing)
- [5.2: Enrollment Escalations](#52-enrollment-escalations)
  - [5.2.1: EL1 — Force-Start Tournament](#521-el1--force-start-tournament-after-enrollment-window-expires)
- [5.3: Match Escalations](#53-match-escalations)
  - [5.3.1: ML1 — Claim Victory by Opponent Timeout](#531-ml1--claim-victory-by-opponent-timeout)

**6. Edge Cases & FAQ**
- [6.1: What if nobody joins my lobby?](#61-what-if-nobody-joins-my-lobby)

**[7. Glossary](#7-glossary)**

---

## 1. Getting Started

### 1.1: What is ETour?

ETour is a fully on-chain tournament platform.

## 3. Matches & Play

### 3.2: Draws

Draws eliminate both players.

## 4. Resolution

### 4.6: ML1 - Match Timeout

ML1 resolves a match when a player's clock hits zero.

## 5. Anti-Griefing

### 5.1: What's Griefing?

Griefing blocks progress.

### 5.2: Enrollment Escalations

Enrollment escalations protect stalled tournaments.

#### 5.2.1: EL1 — Force-Start Tournament After Enrollment Window Expires

Force-start the tournament.

### 5.3: Match Escalations

#### 5.3.1: ML1 — Claim Victory by Opponent Timeout

Trigger ML1 when your opponent times out.

## 6. Edge Cases & FAQ

### 6.1: What if nobody joins my lobby?

No. The moment a second player joins, you lose the ability to cancel.

## 7. Glossary

**Batch**
All matches within the same round.
`;

describe('UserManualV2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = '';
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal('requestAnimationFrame', (callback) => window.setTimeout(callback, 0));
    vi.stubGlobal('cancelAnimationFrame', (id) => window.clearTimeout(id));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(manualMarkdown),
    }));
  });

  it('renders structured navigation from markdown and preserves legacy aliases', async () => {
    const { container } = render(<UserManualV2 />);

    fireEvent.click(screen.getByRole('button', { name: /user manual/i }));

    expect(await screen.findByRole('heading', { name: '1.1: What is ETour?' })).toBeInTheDocument();
    expect(screen.getByText('Browse The Manual')).toBeInTheDocument();
    expect(screen.queryByText('Structured Render')).not.toBeInTheDocument();
    expect(screen.queryByText('Markdown-Native Manual')).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: '1. Getting Started' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: '3. Matches & Play' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('link', { name: '1.1: What is ETour?' })).toHaveAttribute('href', '#11-what-is-etour');
    expect(screen.queryByText('Draws eliminate both players.')).not.toBeInTheDocument();
    expect(window.location.hash).toBe('');

    fireEvent.click(screen.getByRole('button', { name: '3. Matches & Play' }));
    expect(screen.getByRole('button', { name: '3. Matches & Play' })).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '1.1: What is ETour?' })).not.toBeInTheDocument();
      expect(screen.getByText('Draws eliminate both players.')).toBeInTheDocument();
      expect(window.location.hash).toBe('#32-draws');
    });
    expect(container.querySelector('#draws')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '3. Matches & Play' }));
    expect(screen.getByRole('button', { name: '3. Matches & Play' })).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => {
      expect(screen.queryByText('Draws eliminate both players.')).not.toBeInTheDocument();
      expect(window.location.hash).toBe('#user-manual');
    });

    fireEvent.click(screen.getByRole('button', { name: '3. Matches & Play' }));

    expect(screen.queryByText('No. The moment a second player joins, you lose the ability to cancel.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '6. Edge Cases & FAQ' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /6.1: What if nobody joins my lobby\?/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /6.1: What if nobody joins my lobby\?/i }));
    expect(screen.getByText('No. The moment a second player joins, you lose the ability to cancel.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '7. Glossary' }));
    await waitFor(() => {
      expect(screen.getByText('Batch')).toBeInTheDocument();
    });

    window.location.hash = '#ml1';
    fireEvent(window, new HashChangeEvent('hashchange'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '4. Resolution' })).toHaveAttribute('aria-expanded', 'true');
      expect(container.querySelector('#ml1')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith('/User_Manual.md');
  });

  it('can render the full manual as a sticky document view', async () => {
    render(<UserManualV2 defaultExpanded collapsible={false} showAllSections />);

    expect(await screen.findByRole('heading', { name: '1.1: What is ETour?' })).toBeInTheDocument();
    expect(screen.getByText('Draws eliminate both players.')).toBeInTheDocument();
    expect(screen.getByText('Trigger ML1 when your opponent times out.')).toBeInTheDocument();
    expect(screen.getByText('Batch')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '3. Matches & Play' }));

    await waitFor(() => {
      expect(window.location.hash).toBe('#3-matches--play');
    });
  });

  it('auto-expands the section currently in view in full document mode', async () => {
    render(<UserManualV2 defaultExpanded collapsible={false} showAllSections />);

    await screen.findByRole('heading', { name: '1.1: What is ETour?' });

    const firstSection = document.getElementById('1-getting-started');
    const thirdSection = document.getElementById('3-matches--play');
    const fourthSection = document.getElementById('4-resolution');
    const fifthSection = document.getElementById('5-anti-griefing');
    const sixthSection = document.getElementById('6-edge-cases--faq');
    const seventhSection = document.getElementById('7-glossary');

    const createRect = (top) => ({
      top,
      bottom: top + 100,
      left: 0,
      right: 0,
      width: 0,
      height: 100,
      x: 0,
      y: top,
      toJSON: () => ({}),
    });

    firstSection.getBoundingClientRect = vi.fn(() => createRect(-240));
    thirdSection.getBoundingClientRect = vi.fn(() => createRect(120));
    fourthSection.getBoundingClientRect = vi.fn(() => createRect(560));
    fifthSection.getBoundingClientRect = vi.fn(() => createRect(940));
    sixthSection.getBoundingClientRect = vi.fn(() => createRect(1280));
    seventhSection.getBoundingClientRect = vi.fn(() => createRect(1620));

    fireEvent.scroll(window);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '3. Matches & Play' })).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('button', { name: '1. Getting Started' })).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('does not snap back to the selected heading when scroll tracking changes sections in full document mode', async () => {
    render(<UserManualV2 defaultExpanded collapsible={false} showAllSections />);

    await screen.findByRole('heading', { name: '1.1: What is ETour?' });

    fireEvent.click(screen.getByRole('link', { name: '3.2: Draws' }));

    await waitFor(() => {
      expect(window.location.hash).toBe('#32-draws');
    });

    vi.mocked(window.HTMLElement.prototype.scrollIntoView).mockClear();

    const firstSection = document.getElementById('1-getting-started');
    const thirdSection = document.getElementById('3-matches--play');
    const fourthSection = document.getElementById('4-resolution');
    const fifthSection = document.getElementById('5-anti-griefing');
    const sixthSection = document.getElementById('6-edge-cases--faq');
    const seventhSection = document.getElementById('7-glossary');

    const createRect = (top) => ({
      top,
      bottom: top + 100,
      left: 0,
      right: 0,
      width: 0,
      height: 100,
      x: 0,
      y: top,
      toJSON: () => ({}),
    });

    firstSection.getBoundingClientRect = vi.fn(() => createRect(-900));
    thirdSection.getBoundingClientRect = vi.fn(() => createRect(-500));
    fourthSection.getBoundingClientRect = vi.fn(() => createRect(120));
    fifthSection.getBoundingClientRect = vi.fn(() => createRect(540));
    sixthSection.getBoundingClientRect = vi.fn(() => createRect(920));
    seventhSection.getBoundingClientRect = vi.fn(() => createRect(1260));

    fireEvent.scroll(window);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '4. Resolution' })).toHaveAttribute('aria-expanded', 'true');
    });

    expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('keeps nested anti-griefing subsections collapsed until expanded', async () => {
    render(<UserManualV2 />);

    fireEvent.click(screen.getByRole('button', { name: /user manual/i }));
    fireEvent.click(await screen.findByRole('button', { name: '5. Anti-Griefing' }));

    const enrollmentToggle = await screen.findByRole('button', { name: /expand 5.2: enrollment escalations/i });
    const matchToggle = screen.getByRole('button', { name: /expand 5.3: match escalations/i });

    expect(enrollmentToggle).toHaveAttribute('aria-expanded', 'false');
    expect(matchToggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(enrollmentToggle);

    expect(screen.getByRole('button', { name: /collapse 5.2: enrollment escalations/i })).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens to the first subsection when the manual open event targets 1.1', async () => {
    render(<UserManualV2 />);

    await act(async () => {
      window.dispatchEvent(new CustomEvent('open-user-manual', {
        detail: { targetHash: '11-what-is-etour' },
      }));
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /user manual/i })).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('button', { name: '1. Getting Started' })).toHaveAttribute('aria-expanded', 'true');
      expect(window.location.hash).toBe('#11-what-is-etour');
    });
  });
});
