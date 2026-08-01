import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import {
  initialV3SessionState,
  v3SessionReducer,
} from '../session/sessionState';
import {
  createV3SessionIdentity,
  V3BrowserSessionService,
} from '../session/service';
import { V3_RUNTIME_CONFIG } from '../config/runtimeConfig';

function publicError(error) {
  return {
    code: error?.code || 'V3_SESSION_ERROR',
    message: error?.message || 'Session storage or sponsorship is unavailable.',
  };
}

export function useV3Session({
  account,
  instanceAddress,
  factoryAddress,
  browserProvider,
  lifecyclePollMs = 15_000,
} = {}) {
  const [state, dispatch] = useReducer(v3SessionReducer, initialV3SessionState);
  const servicePromiseRef = useRef(null);
  const inspectionSequenceRef = useRef(0);
  const actionInProgressRef = useRef(false);

  const getService = useCallback(async () => {
    if (!servicePromiseRef.current) {
      servicePromiseRef.current = V3BrowserSessionService.create();
    }
    return servicePromiseRef.current;
  }, []);

  const activeIdentity = useMemo(() => {
    if (!account || !instanceAddress) return null;
    try {
      return createV3SessionIdentity(instanceAddress, account);
    } catch {
      return null;
    }
  }, [account, instanceAddress]);

  const inspect = useCallback(async (
    selectedIdentity = activeIdentity,
    { showRestoring = true } = {},
  ) => {
    if (!selectedIdentity) return null;
    if (actionInProgressRef.current) return null;
    const sequence = ++inspectionSequenceRef.current;
    if (showRestoring) dispatch({ type: 'RESTORE_STARTED' });
    try {
      const service = await getService();
      const inspection = await service.restore(selectedIdentity, {
        factory: factoryAddress,
      });
      if (sequence === inspectionSequenceRef.current) {
        dispatch({ type: 'INSPECTION_RECEIVED', inspection });
      }
      return inspection;
    } catch (error) {
      if (sequence === inspectionSequenceRef.current) {
        dispatch({ type: 'SESSION_UNAVAILABLE', error: publicError(error) });
      }
      return null;
    }
  }, [activeIdentity, factoryAddress, getService]);

  useEffect(() => {
    dispatch({ type: 'IDENTITY_CHANGED', identity: activeIdentity });
    if (activeIdentity) void inspect(activeIdentity, { showRestoring: false });
  }, [activeIdentity, inspect]);

  useEffect(() => {
    let unsubscribe;
    let cancelled = false;
    if (!activeIdentity) return undefined;
    void getService().then((service) => {
      if (cancelled) return;
      unsubscribe = service.subscribe(() => void inspect(
        activeIdentity,
        { showRestoring: false },
      ));
    }).catch(() => {});
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [activeIdentity, getService, inspect]);

  useEffect(() => {
    if (!activeIdentity || lifecyclePollMs <= 0) return undefined;
    const interval = globalThis.setInterval(() => {
      void inspect(activeIdentity, { showRestoring: false });
    }, lifecyclePollMs);
    return () => globalThis.clearInterval(interval);
  }, [activeIdentity, inspect, lifecyclePollMs]);

  useEffect(() => {
    if (!activeIdentity) return undefined;
    const tick = () => dispatch({
      type: 'CLOCK_TICK',
      now: BigInt(Math.floor(Date.now() / 1_000)),
    });
    tick();
    const interval = globalThis.setInterval(tick, 1_000);
    return () => globalThis.clearInterval(interval);
  }, [activeIdentity]);

  useEffect(() => () => {
    const servicePromise = servicePromiseRef.current;
    servicePromiseRef.current = null;
    void servicePromise?.then((service) => service.close()).catch(() => {});
  }, []);

  const prepareCreation = useCallback(async (factory) => {
    dispatch({ type: 'PREPARE_STARTED' });
    try {
      const service = await getService();
      const prepared = await service.prepareCreation({ factory, primary: account });
      dispatch({ type: 'SESSION_PREPARED', executor: prepared.executor });
      return prepared;
    } catch (error) {
      dispatch({ type: 'FAILURE', error: publicError(error) });
      throw error;
    }
  }, [account, getService]);

  const finalizeCreation = useCallback(async (prepared, instance) => {
    dispatch({ type: 'TRANSACTION_SUBMITTED' });
    const service = await getService();
    const finalized = await service.finalizeCreation(prepared, instance);
    dispatch({ type: 'INSPECTION_RECEIVED', inspection: finalized.inspection });
    return finalized;
  }, [getService]);

  const prepareEnrollment = useCallback(async (instance) => {
    dispatch({ type: 'PREPARE_STARTED' });
    try {
      const service = await getService();
      const prepared = await service.prepareEnrollment({ instance, primary: account });
      dispatch({ type: 'SESSION_PREPARED', executor: prepared.executor });
      return prepared;
    } catch (error) {
      dispatch({ type: 'FAILURE', error: publicError(error) });
      throw error;
    }
  }, [account, getService]);

  const confirmEnrollment = useCallback(async (prepared) => {
    dispatch({ type: 'TRANSACTION_SUBMITTED' });
    const service = await getService();
    const inspection = await service.inspect(prepared.identity);
    dispatch({ type: 'INSPECTION_RECEIVED', inspection });
    return inspection;
  }, [getService]);

  const discardCreation = useCallback(async (prepared) => {
    const service = await getService();
    await service.discardCreation(prepared);
  }, [getService]);

  const discardEnrollment = useCallback(async (prepared) => {
    const service = await getService();
    await service.discardEnrollment(prepared);
  }, [getService]);

  const getPrimarySigner = useCallback(async () => {
    if (!browserProvider || !account) {
      throw new Error('Connect the enrolled primary wallet first.');
    }
    const signer = await browserProvider.getSigner();
    const signerAddress = await signer.getAddress();
    if (signerAddress.toLowerCase() !== account.toLowerCase()) {
      throw new Error('The connected wallet is not the active primary player.');
    }
    return signer;
  }, [account, browserProvider]);

  const refreshSession = useCallback(async () => {
    if (!activeIdentity || actionInProgressRef.current) return null;
    actionInProgressRef.current = true;
    inspectionSequenceRef.current += 1;
    dispatch({ type: 'REFRESH_STARTED' });
    try {
      const [service, signer] = await Promise.all([
        getService(),
        getPrimarySigner(),
      ]);
      const refreshed = await service.refreshSession(activeIdentity, signer);
      dispatch({
        type: 'INSPECTION_RECEIVED',
        inspection: refreshed.inspection,
        completeAction: true,
      });
      dispatch({ type: 'SESSION_SELECTED' });
      return refreshed;
    } catch (error) {
      dispatch({ type: 'ACTION_FAILURE', error: publicError(error) });
      return null;
    } finally {
      actionInProgressRef.current = false;
    }
  }, [activeIdentity, getPrimarySigner, getService]);

  const revokeSession = useCallback(async () => {
    if (!activeIdentity || actionInProgressRef.current) return null;
    actionInProgressRef.current = true;
    inspectionSequenceRef.current += 1;
    dispatch({ type: 'REVOKE_STARTED' });
    try {
      const [service, signer] = await Promise.all([
        getService(),
        getPrimarySigner(),
      ]);
      const inspection = await service.revokeSession(activeIdentity, signer);
      dispatch({
        type: 'INSPECTION_RECEIVED',
        inspection,
        completeAction: true,
      });
      dispatch({ type: 'DIRECT_PRIMARY_SELECTED' });
      return inspection;
    } catch (error) {
      dispatch({ type: 'ACTION_FAILURE', error: publicError(error) });
      return null;
    } finally {
      actionInProgressRef.current = false;
    }
  }, [activeIdentity, getPrimarySigner, getService]);

  return {
    state,
    identity: activeIdentity,
    getService,
    inspect,
    prepareCreation,
    finalizeCreation,
    discardCreation,
    prepareEnrollment,
    confirmEnrollment,
    discardEnrollment,
    refreshSession,
    revokeSession,
    selectDirectPrimary: () => dispatch({ type: 'DIRECT_PRIMARY_SELECTED' }),
    selectSession: () => dispatch({ type: 'SESSION_SELECTED' }),
    runtimeReady: V3_RUNTIME_CONFIG.capabilities.sessionSubmissionReady,
  };
}
