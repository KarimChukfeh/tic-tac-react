import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UserManualV2 from './UserManualV2';

const manualMarkdown = `## Table of Contents

**Getting Started**
[What is ETour?](#1-what-is-etour)

---

## Part 1: Getting Started

### 1. What is ETour?

ETour is a fully on-chain tournament platform.

### 8. Draws

Draws eliminate both players.

#### ML1 — Claim Victory by Opponent Timeout

Trigger ML1 when your opponent times out.
`;

describe('UserManualV2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(manualMarkdown),
    }));
  });

  it('renders markdown content from the public manual and preserves legacy aliases', async () => {
    const { container } = render(<UserManualV2 />);

    fireEvent.click(screen.getByRole('button', { name: /user manual/i }));

    expect(await screen.findByRole('heading', { name: '1. What is ETour?' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'What is ETour?' })).toHaveAttribute('href', '#1-what-is-etour');

    await waitFor(() => {
      expect(container.querySelector('#draws')).toBeInTheDocument();
      expect(container.querySelector('#ml1')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith('/User_Manual.md');
  });
});
