import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Docs from './Docs.jsx';

const docsMarkdown = `# ETour Protocol

This is the protocol overview.

## Core Principles

The protocol is modular.

### Factory Layer

Factories coordinate deployments.

### Game Layer

Games validate moves.

## Deployment Model

This supersedes [BuildingGames.md](./BuildingGames.md).

### Factory -> Implementation -> Clone

Deployments stay deterministic.

\`\`\`solidity
instance = _clone(implementation);
\`\`\`
`;

describe('Docs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = '';
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal('requestAnimationFrame', (callback) => window.setTimeout(callback, 0));
    vi.stubGlobal('cancelAnimationFrame', (id) => window.clearTimeout(id));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(docsMarkdown),
    }));
  });

  it('renders docs in a grouped sidebar and pages the content by subsection tabs', async () => {
    render(
      <MemoryRouter>
        <Docs />
      </MemoryRouter>,
    );

    expect(await screen.findByText('ETour Protocol')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Browse Docs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand Architecture' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1. Core Principles' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1.1 Factory Layer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1.2 Game Layer' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1.1 Factory Layer' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '1.2 Game Layer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '2. Deployment Model' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous tab' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next tab' })).toHaveTextContent('1.2 Game Layer');

    fireEvent.click(screen.getByRole('button', { name: '1. Core Principles' }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '1.1 Factory Layer' })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '1. Core Principles' }));
    expect(screen.getByRole('button', { name: '1.1 Factory Layer' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next tab' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '1.2 Game Layer' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('heading', { name: '1.1 Factory Layer' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous tab' })).toHaveTextContent('1.1 Factory Layer');
    expect(screen.getByRole('button', { name: 'Next tab' })).toHaveTextContent('2.1 Factory -> Implementation -> Clone');

    fireEvent.click(screen.getByRole('button', { name: 'Next tab' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '2. Deployment Model' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '2. Deployment Model' }));
    expect(screen.getByRole('button', { name: '2.1 Factory -> Implementation -> Clone' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous tab' })).toHaveTextContent('1.2 Game Layer');
    expect(screen.getByRole('button', { name: 'Next tab' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'BuildingGames.md' })).toHaveAttribute(
      'href',
      '#building-games-on-etour',
    );
    expect(screen.getByText('solidity')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/Docs.md');
  });
});
