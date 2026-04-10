import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import TournamentHeader from './TournamentHeader';

const baseProps = {
  gameType: 'tictactoe',
  tierId: 0,
  instanceId: 0,
  status: 0,
  currentRound: 0,
  playerCount: 4,
  enrolledCount: 4,
  prizePool: 1000000000000000000n,
  enrolledPlayers: [
    '0x1111111111111111111111111111111111111111',
    '0x2222222222222222222222222222222222222222',
  ],
  syncDots: 1,
  account: '0x1111111111111111111111111111111111111111',
  onBack: vi.fn(),
};

describe('TournamentHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    window.IntersectionObserver = class {
      observe() {}
      disconnect() {}
    };
  });

  it('hides the share section while a tournament is in progress', () => {
    render(
      <TournamentHeader
        {...baseProps}
        status={1}
      />
    );

    expect(screen.queryByText('Invite a Friend')).not.toBeInTheDocument();
    expect(screen.queryByText('Share results')).not.toBeInTheDocument();
  });

  it('keeps the invite section for enrolling tournaments', () => {
    render(
      <TournamentHeader
        {...baseProps}
        status={0}
      />
    );

    expect(screen.getByText('Invite a Friend')).toBeInTheDocument();
  });

  it('shows the instance address as an arbiscan link when provided', () => {
    const instanceAddress = '0x8478136de0123aedccbbd8a8c0af0d8cecd92740';

    render(
      <TournamentHeader
        {...baseProps}
        instanceAddress={instanceAddress}
      />
    );

    expect(screen.getByRole('heading', { name: 'TicTacToe Tournament' })).toBeInTheDocument();
    expect(screen.queryByText('TicTacToe Tournament T1-I1')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Unique Instance 0x8478...2740' })).toHaveAttribute('href', `https://arbiscan.io/address/${instanceAddress}`);
    expect(screen.queryByText('Round 1/2')).not.toBeInTheDocument();
  });

  it('shows completed resolution text and relabels sharing for finished tournaments', () => {
    render(
      <TournamentHeader
        {...baseProps}
        status={2}
        winner="0x1234567890abcdef1234567890abcdef12345678"
        completionReason={1}
      />
    );

    expect(screen.getByText('Share results')).toBeInTheDocument();
    expect(screen.getByText('Resolution')).toBeInTheDocument();
    expect(screen.getByText(/0x1234\.\.\.5678/)).toBeInTheDocument();
    expect(screen.getByText(/wins by timeout \(ML1\)/i)).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === 'Winner awarded 1.00000 ETH')).toBeInTheDocument();
  });

  it('shows detailed prize and owner-cut resolution values when provided', () => {
    render(
      <TournamentHeader
        {...baseProps}
        status={2}
        winner="0x1234567890abcdef1234567890abcdef12345678"
        completionReason={1}
        totalEntryFeesAccrued={1000000000000000000n}
        prizeAwarded={800000000000000000n}
        prizeRecipient="0x1234567890abcdef1234567890abcdef12345678"
      />
    );

    expect(screen.getByText('Payouts')).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent?.trim() === 'Prize')).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent?.trim() === 'Owner cut')).toBeInTheDocument();
    expect(screen.getByText('0.80000 ETH')).toBeInTheDocument();
    expect(screen.getByText('0.20000 ETH')).toBeInTheDocument();
    expect(screen.getByText(/0x1234\.\.\.5678/)).toBeInTheDocument();
    expect(screen.queryByText('Resolution')).not.toBeInTheDocument();
    expect(screen.queryByText(/wins by timeout \(ML1\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText((_, element) => element?.textContent === 'Winner awarded 1.00000 ETH')).not.toBeInTheDocument();
  });

  it('uses V2-coded resolution labels when explicitly enabled', () => {
    render(
      <TournamentHeader
        {...baseProps}
        status={2}
        winner="0x1234567890abcdef1234567890abcdef12345678"
        completionReason={7}
        reasonLabelMode="v2"
      />
    );

    expect(screen.getByRole('link', { name: /via r2 uncontested finals resolution/i })).toBeInTheDocument();
  });

  it('shows a connect-to-enrol CTA when the wallet is not connected', () => {
    const onConnectWallet = vi.fn();

    render(
      <TournamentHeader
        {...baseProps}
        account={null}
        enrolledCount={1}
        isEnrolled={false}
        isFull={false}
        entryFee="0.001"
        onConnectWallet={onConnectWallet}
      />
    );

    const cta = screen.getByRole('button', { name: 'Connect to Enrol' });
    expect(cta).toBeInTheDocument();
    fireEvent.click(cta);
    expect(onConnectWallet).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Connect your wallet to join this tournament')).toBeInTheDocument();
  });

  it('shows solo-enroller cancel and reset actions instead of force start', async () => {
    const onCancelTournament = vi.fn();
    const onResetEnrollmentWindow = vi.fn();
    const contract = {
      canResetEnrollmentWindow: {
        staticCall: vi.fn().mockResolvedValue(true),
      },
    };

    render(
      <TournamentHeader
        {...baseProps}
        enrolledCount={1}
        isEnrolled
        enrollmentTimeout={{
          escalation1Start: Math.floor(Date.now() / 1000) + 300,
          escalation2Start: Math.floor(Date.now() / 1000) + 600,
          activeEscalation: 0,
          forfeitPool: 0n,
        }}
        onCancelTournament={onCancelTournament}
        onResetEnrollmentWindow={onResetEnrollmentWindow}
        onManualStart={vi.fn()}
        contract={contract}
      />
    );

    expect(await screen.findByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Reset' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Force Start/i })).not.toBeInTheDocument();

    const statusCard = screen.getByText('You are the sole enroller').closest('.border');
    const actionGrid = screen.getByRole('button', { name: 'Cancel' }).closest('.grid');
    expect(document.body.textContent.indexOf('Invite a Friend')).toBeLessThan(document.body.textContent.indexOf('You are the sole enroller'));
    expect(statusCard).toContainElement(actionGrid);
    expect(actionGrid).toHaveClass('grid-cols-2');
    expect(actionGrid).toContainElement(screen.getByRole('link', { name: 'Learn about Cancellations' }));
    expect(actionGrid).toContainElement(screen.getByRole('link', { name: 'Learn about Resetting Enrollment' }));
    expect(actionGrid.textContent.indexOf('Learn about Cancellations')).toBeLessThan(actionGrid.textContent.lastIndexOf('Cancel'));
    expect(actionGrid.textContent.indexOf('Learn about Resetting Enrollment')).toBeLessThan(actionGrid.textContent.lastIndexOf('Reset'));
    expect(actionGrid.textContent.indexOf('Learn about Resetting Enrollment')).toBeLessThan(actionGrid.textContent.indexOf('Learn about Cancellations'));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancelTournament).toHaveBeenCalledWith(0, 0);
  });

  it('shows the solo-enroller reset action when a wrapper forces the CTA', async () => {
    render(
      <TournamentHeader
        {...baseProps}
        enrolledCount={1}
        isEnrolled
        enrollmentTimeout={{
          escalation1Start: Math.floor(Date.now() / 1000) + 300,
          escalation2Start: Math.floor(Date.now() / 1000) + 600,
          activeEscalation: 0,
          forfeitPool: 0n,
        }}
        onCancelTournament={vi.fn()}
        onResetEnrollmentWindow={vi.fn()}
        forceShowResetEnrollmentWindow
      />
    );

    expect(await screen.findByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  it('shows the enrolment window timer inside the status card when a deadline is provided', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-02T12:00:00Z'));

    render(
      <TournamentHeader
        {...baseProps}
        enrolledCount={2}
        status={0}
        statusTimerTarget={Math.floor(Date.now() / 1000) + 90}
      />
    );

    expect(screen.getByText('Window closes in 1m 30s')).toBeInTheDocument();
    expect(screen.queryByText('Enrollment Time Remaining')).not.toBeInTheDocument();
  });

  it('uses the v2 enrolment header copy and hides the round card', () => {
    render(
      <TournamentHeader
        {...baseProps}
        reasonLabelMode="v2"
        status={0}
      />
    );

    expect(screen.getByText('Current Pot')).toBeInTheDocument();
    expect(screen.queryByText('Prize Pool')).not.toBeInTheDocument();
    expect(screen.queryByText('Round')).not.toBeInTheDocument();
    expect(screen.queryByText('1/2')).not.toBeInTheDocument();
    expect(screen.queryByText(/Enrolled Players/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand players' }));

    expect(screen.getByText('0x1111...1111')).toBeInTheDocument();
    expect(screen.getByText('0x2222...2222')).toBeInTheDocument();
  });

  it('shows completed v2 cards and expands enrolled players on demand', () => {
    render(
      <TournamentHeader
        {...baseProps}
        status={2}
        reasonLabelMode="v2"
        completionReason={1}
        payoutEntries={[
          {
            recipient: '0x1234567890abcdef1234567890abcdef12345678',
            amount: 500000000000000000n,
          },
          {
            recipient: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            amount: 500000000000000000n,
          },
        ]}
      />
    );

    expect(screen.getByText('Payout')).toBeInTheDocument();
    expect(screen.queryByText('Payouts')).not.toBeInTheDocument();
    expect(screen.queryByText(/Enrolled Players/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /via ml1 timeout/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Transferred/i)).toHaveLength(2);
    expect(screen.queryByText('0x1111111111111111111111111111111111111111')).not.toBeInTheDocument();
    expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
    expect(screen.getByText('0xabcd...abcd')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand players' }));

    expect(screen.getByText('0x1111...1111')).toBeInTheDocument();
    expect(screen.getByText('0x2222...2222')).toBeInTheDocument();
  });

  it('uses the same resolved layout for cancelled v2 tournaments', () => {
    render(
      <TournamentHeader
        {...baseProps}
        status={3}
        reasonLabelMode="v2"
        completionReason={5}
        payoutEntries={[
          {
            recipient: '0x1234567890abcdef1234567890abcdef12345678',
            amount: 1000000000000000000n,
          },
        ]}
      />
    );

    expect(screen.getByText('Payout')).toBeInTheDocument();
    expect(screen.queryByText('Payouts')).not.toBeInTheDocument();
    expect(screen.queryByText(/Enrolled Players/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /via el0 tournament canceled/i })).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.queryByText('Prize Pool')).not.toBeInTheDocument();
    expect(screen.getByText(/Refunded/i)).toBeInTheDocument();
    expect(screen.queryByText(/Transferred/i)).not.toBeInTheDocument();
  });

  it('shows abandoned status styling for EL2 tournaments', () => {
    render(
      <TournamentHeader
        {...baseProps}
        status={3}
        reasonLabelMode="v2"
        completionReason={6}
        payoutEntries={[
          {
            recipient: '0x1234567890abcdef1234567890abcdef12345678',
            amount: 1000000000000000000n,
          },
        ]}
      />
    );

    const abandonedLabel = screen.getByText('Abandoned');
    expect(abandonedLabel).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /via el2 abandoned pool claimed/i })).toBeInTheDocument();
    expect(abandonedLabel.closest('div')).toHaveClass('text-red-300');
  });
});
