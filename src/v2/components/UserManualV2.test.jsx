import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UserManualV2 from './UserManualV2';

const manualMarkdown = `## Table of Contents

**1. Getting Started**
- [1.1: What is ETour?](#11-what-is-etour)

**3. Match Play**
- [3.2: Draws](#32-draws)

**5. Escalation System**
- [5.3: Match Escalations](#53-match-escalations)
  - [5.3.1: ML1 — Claim Victory by Opponent Timeout](#531-ml1--claim-victory-by-opponent-timeout)

**6. Edge Cases & FAQ**
- [6.1: What if nobody joins my lobby?](#61-what-if-nobody-joins-my-lobby)

**[7. Glossary](#7-glossary)**

---

## 1. Getting Started

### 1.1: What is ETour?

ETour is a fully on-chain tournament platform.

## 3. Match Play

### 3.2: Draws

Draws eliminate both players.

## 5. Escalation System

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
    expect(screen.getByRole('button', { name: '3. Match Play' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('link', { name: '1.1: What is ETour?' })).toHaveAttribute('href', '#11-what-is-etour');
    expect(screen.queryByText('Draws eliminate both players.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '3. Match Play' }));
    expect(screen.getByRole('button', { name: '3. Match Play' })).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '1.1: What is ETour?' })).not.toBeInTheDocument();
      expect(screen.getByText('Draws eliminate both players.')).toBeInTheDocument();
    });
    expect(container.querySelector('#draws')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '3. Match Play' }));
    expect(screen.getByRole('button', { name: '3. Match Play' })).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => {
      expect(screen.queryByText('Draws eliminate both players.')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '3. Match Play' }));

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
      expect(screen.getByRole('button', { name: '5. Escalation System' })).toHaveAttribute('aria-expanded', 'true');
      expect(container.querySelector('#ml1')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith('/User_Manual.md');
  });
});
