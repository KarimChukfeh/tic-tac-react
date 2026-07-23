import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ArenaGameHero from './ArenaGameHero';

describe('ArenaGameHero', () => {
  it.each([
    ['chess', 'Chess'],
    ['connect4', 'Connect Four'],
  ])('renders the %s arena controls', (game, title) => {
    const onToggleEffects = vi.fn();

    render(
      <MemoryRouter>
        <ArenaGameHero game={game} onToggleEffects={onToggleEffects} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    const effectsSwitch = screen.getByRole('switch', { name: '3D Effects on' });
    expect(effectsSwitch).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(effectsSwitch);
    expect(onToggleEffects).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: "What's This?" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quick Guide' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'User Manual' })).toBeInTheDocument();
  });
});
