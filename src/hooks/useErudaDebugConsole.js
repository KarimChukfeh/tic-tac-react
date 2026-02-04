import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function isDebugEnabled(search) {
  try {
    return new URLSearchParams(search).get('debug') === '1';
  } catch {
    return false;
  }
}

function ensureErudaLoaded(onReady) {
  if (typeof window === 'undefined') return;

  if (window.eruda) {
    onReady?.();
    return;
  }

  const existingScript = document.querySelector('script[data-eruda="true"]');
  if (existingScript) {
    existingScript.addEventListener('load', () => onReady?.(), { once: true });
    return;
  }

  const script = document.createElement('script');
  script.dataset.eruda = 'true';
  script.src = 'https://cdn.jsdelivr.net/npm/eruda';
  script.onload = () => onReady?.();
  document.body.appendChild(script);
}

export function useErudaDebugConsole() {
  const location = useLocation();

  useEffect(() => {
    const enabled = isDebugEnabled(location.search);
    if (!enabled) {
      try {
        window.eruda?.destroy?.();
      } catch {
        // ignore
      }
      return;
    }

    ensureErudaLoaded(() => {
      try {
        window.eruda?.init?.();
      } catch {
        // ignore
      }
    });
  }, [location.search]);
}

