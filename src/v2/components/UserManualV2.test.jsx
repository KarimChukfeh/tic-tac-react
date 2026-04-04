import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UserManualV2 from './UserManualV2';

const manualMarkdown = `## Table of Contents

**1. Getting Started**
- [1.1: What is ETour?](#11-what-is-etour)

**3. Matches & Play**
- [3.2: Draws](#32-draws)

**5. Anti-Griefing**
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

## 5. Anti-Griefing

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
      expect(screen.getByRole('button', { name: '5. Anti-Griefing' })).toHaveAttribute('aria-expanded', 'true');
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
    fifthSection.getBoundingClientRect = vi.fn(() => createRect(560));
    sixthSection.getBoundingClientRect = vi.fn(() => createRect(940));
    seventhSection.getBoundingClientRect = vi.fn(() => createRect(1280));

    fireEvent.scroll(window);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '3. Matches & Play' })).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('button', { name: '1. Getting Started' })).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
