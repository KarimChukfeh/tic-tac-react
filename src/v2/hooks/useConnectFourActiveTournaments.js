import { useState, useEffect, useCallback } from 'react';
import { getInstanceContract, normalizeInstanceSnapshot } from '../lib/connectfour';

const MAX_PAST = 10;

async function fetchSnapshot(address, runner, account) {
  const instance = getInstanceContract(address, runner);
  const [info, tournament, players] = await Promise.all([
    instance.getInstanceInfo(),
    instance.tournament(),
    instance.getPlayers(),
  ]);
  const isEnrolled = account
    ? await instance.isEnrolled(account).catch(() => false)
    : false;
  return normalizeInstanceSnapshot(address, info, tournament, players, isEnrolled);
}

export function useConnectFourActiveTournaments(factoryContract, runner, account) {
  const [active, setActive] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!factoryContract || !runner) {
      setLoading(false);
      return;
    }
    try {
      setError(null);

      const [activeCount, pastCount] = await Promise.all([
        factoryContract.getActiveTournamentCount(),
        factoryContract.getPastTournamentCount(),
      ]);

      const activeTotal = Number(activeCount);
      const pastTotal = Number(pastCount);

      const activeAddresses = await Promise.all(
        Array.from({ length: activeTotal }, (_, i) => factoryContract.activeTournaments(i))
      );

      const pastOffset = Math.max(0, pastTotal - MAX_PAST);
      const pastAddresses = await Promise.all(
        Array.from({ length: Math.min(pastTotal, MAX_PAST) }, (_, i) => factoryContract.pastTournaments(pastOffset + i))
      );

      const [activeSnaps, pastSnaps] = await Promise.all([
        Promise.all(activeAddresses.map(addr => fetchSnapshot(addr, runner, account).catch(() => null))),
        Promise.all(pastAddresses.map(addr => fetchSnapshot(addr, runner, account).catch(() => null))),
      ]);

      setActive(activeSnaps.filter(Boolean).reverse());
      setPast(pastSnaps.filter(Boolean).reverse());
    } catch (err) {
      console.error('[useConnectFourActiveTournaments] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [factoryContract, runner, account]);

  useEffect(() => {
    setLoading(true);
    fetch();
  }, [fetch]);

  useEffect(() => {
    if (!factoryContract || !runner) return;
    const id = setInterval(() => fetch(), 8000);
    return () => clearInterval(id);
  }, [factoryContract, runner, fetch]);

  return { active, past, loading, error, refetch: fetch };
}
