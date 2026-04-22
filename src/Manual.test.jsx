import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Manual from './Manual.jsx';

const manualMarkdown = `## Table of Contents

**1. Getting Started**
- [1.1: What is ETour?](#11-what-is-etour)

**3. Matches & Play**
- [3.2: Draws](#32-draws)

---

## 1. Getting Started

### 1.1: What is ETour?

ETour is a fully on-chain tournament platform.

## 3. Matches & Play

### 3.2: Draws

Draws eliminate both players.
`;

describe('Manual', () => {
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

  it('renders the manual as a sidebar plus a single selected section', async () => {
    render(
      <MemoryRouter>
        <Manual />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Browse The Manual')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1. Getting Started' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: '3. Matches & Play' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('heading', { name: '1.1: What is ETour?' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '3.2: Draws' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '3. Matches & Play' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '3.2: Draws' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('heading', { name: '1.1: What is ETour?' })).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/User_Manual.md');
  });

  it('keeps the mobile drawer open on top-level section taps and closes on leaf selection', async () => {
    render(
      <MemoryRouter>
        <Manual />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '1.1: What is ETour?' })).toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'Open manual navigation' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    const closeToggle = screen.getByRole('button', { name: 'Close manual navigation', expanded: true });
    expect(closeToggle).toBeInTheDocument();

    const drawerHeading = screen.getByRole('heading', { name: 'Browse The Manual' });
    const drawer = drawerHeading.closest('div.absolute');
    expect(drawer).not.toBeNull();

    fireEvent.click(within(drawer).getByRole('button', { name: '3. Matches & Play' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Close manual navigation', expanded: true })).toBeInTheDocument();
      expect(within(drawer).getByRole('link', { name: '3.2: Draws' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('heading', { name: '3.2: Draws' })).not.toBeInTheDocument();

    fireEvent.click(within(drawer).getByRole('link', { name: '3.2: Draws' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open manual navigation' })).toHaveAttribute('aria-expanded', 'false');
      expect(screen.getByRole('heading', { name: '3.2: Draws' })).toBeInTheDocument();
    });
  });
});
