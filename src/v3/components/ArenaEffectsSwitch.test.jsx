import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ArenaEffectsSwitch from './ArenaEffectsSwitch';

describe('ArenaEffectsSwitch', () => {
  it('exposes its state and toggles from the match view', () => {
    const onToggle = vi.fn();

    render(
      <ArenaEffectsSwitch
        enabled={false}
        onToggle={onToggle}
        context="match"
      />,
    );

    const effectsSwitch = screen.getByRole('switch', { name: 'Match 3D Effects off' });
    expect(effectsSwitch).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(effectsSwitch);
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
