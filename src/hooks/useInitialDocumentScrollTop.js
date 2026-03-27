import { useEffect, useLayoutEffect } from 'react';
import { shouldResetOnInitialDocumentLoad } from '../utils/navigation';

function scrollDocumentToTop() {
  if (typeof window === 'undefined') return;

  window.scrollTo(0, 0);

  if (document.documentElement) {
    document.documentElement.scrollTop = 0;
  }

  if (document.body) {
    document.body.scrollTop = 0;
  }
}

export function useInitialDocumentScrollTop(routePath, options = {}) {
  const shouldScrollToTop = shouldResetOnInitialDocumentLoad(routePath, options);

  useLayoutEffect(() => {
    if (!shouldScrollToTop || typeof window === 'undefined') {
      return undefined;
    }

    const historyState = window.history;
    const previousScrollRestoration = historyState?.scrollRestoration;
    const frameIds = [];

    if (historyState && 'scrollRestoration' in historyState) {
      historyState.scrollRestoration = 'manual';
    }

    scrollDocumentToTop();

    frameIds.push(window.requestAnimationFrame(() => {
      scrollDocumentToTop();
      frameIds.push(window.requestAnimationFrame(scrollDocumentToTop));
    }));

    const timeoutId = window.setTimeout(scrollDocumentToTop, 0);

    return () => {
      frameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
      window.clearTimeout(timeoutId);

      if (historyState && 'scrollRestoration' in historyState && previousScrollRestoration) {
        historyState.scrollRestoration = previousScrollRestoration;
      }
    };
  }, [shouldScrollToTop]);

  useEffect(() => {
    if (!shouldScrollToTop || typeof window === 'undefined') {
      return undefined;
    }

    const handlePageShow = () => {
      scrollDocumentToTop();
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [shouldScrollToTop]);
}
