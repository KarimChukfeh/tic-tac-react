import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import V3SessionStatus, { getV3MoveCostView } from './V3SessionStatus';

const activeState = {
  status: 'active',
  identity: {},
  inspection: { localAvailable: true },
  secondsRemaining: 3_600n,
  directPrimaryMode: false,
  pendingAction: null,
};

describe('V3SessionStatus', () => {
  it('always shows the sponsored next-move estimate on the player turn', () => {
    render(
      <V3SessionStatus
        state={activeState}
        hasActiveMatch
        isPlayerTurn
        estimatedGasCost="0.00001 ETH"
      />,
    );

    expect(screen.getByText('Your move is ready')).toBeInTheDocument();
    expect(screen.getByText('0.00001 ETH')).toBeInTheDocument();
    expect(screen.queryByText(/estimated network fee|expected to be sponsored/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/executor|chain id|json/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows only a waiting status when it is the opponent turn', () => {
    render(
      <V3SessionStatus
        state={{ ...activeState, status: 'expired' }}
        hasActiveMatch
        isPlayerTurn={false}
      />,
    );

    expect(screen.getByText('Waiting for your opponent')).toBeInTheDocument();
    expect(screen.getByText('Their turn')).toBeInTheDocument();
    expect(screen.queryByText(/next-move gas estimate will appear/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Estimate unavailable')).not.toBeInTheDocument();
  });

  it('explains that a wallet confirmation is required when prompt-free moves are unavailable', () => {
    render(
      <V3SessionStatus
        state={{
          ...activeState,
          status: 'missing-local',
          inspection: { localAvailable: false },
        }}
        hasActiveMatch
        isPlayerTurn
      />,
    );

    expect(screen.getByText('Wallet confirmation required')).toBeInTheDocument();
    expect(screen.getByText('Cannot estimate')).toBeInTheDocument();
    expect(screen.queryByText(/prompt-free moves are unavailable|saved prompt-free key|make your move/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a non-actionable checking state while reload restoration finishes', () => {
    render(
      <V3SessionStatus
        state={{ ...activeState, status: 'restoring', inspection: null }}
        hasActiveMatch
        isPlayerTurn
      />,
    );

    expect(screen.getByText('Checking prompt-free moves')).toBeInTheDocument();
    expect(screen.getByText('Checking…')).toBeInTheDocument();
    expect(screen.getByText(/no action is needed/i)).toBeInTheDocument();
  });

  it('shows an idle waiting state outside an active match', () => {
    render(<V3SessionStatus state={activeState} />);

    expect(screen.getByText('Waiting for an active match')).toBeInTheDocument();
    expect(screen.getByText(/gas estimate will appear/i)).toBeInTheDocument();
  });

  it('treats disabled sponsorship as requiring a wallet confirmation', () => {
    expect(getV3MoveCostView({
      state: activeState,
      hasActiveMatch: true,
      isPlayerTurn: true,
      runtimeReady: false,
    })).toMatchObject({
      tone: 'attention',
      value: 'Cannot estimate',
    });
  });
});
