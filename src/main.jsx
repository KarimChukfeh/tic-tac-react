import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Landing from './Landing.jsx'
import TicTacChain from './TicTacChain.jsx'
import Chess from './Chess.jsx'
import ConnectFour from './ConnectFour.jsx'
import TicTacToeV2 from './v2/pages/TicTacToeV2.jsx'
import ConnectFourV2 from './v2/pages/ConnectFourV2.jsx'
import ChessV2 from './v2/pages/ChessV2.jsx'
import Whitepaper from './Whitepaper.jsx'
import Manual from './Manual.jsx'
import NotFound from './NotFound.jsx'
import WalletBrowserPrompt from './components/WalletBrowserPrompt.jsx'
import './index.css'
import { useWalletBrowserPrompt } from './hooks/useWalletBrowserPrompt'
import { useErudaDebugConsole } from './hooks/useErudaDebugConsole'

const PAGE_EXIT_DURATION_MS = 180;
const PAGE_ENTER_DURATION_MS = 320;

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

function ScrollToTopOnPathChange({ pathname }) {

  React.useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}

function AppRoutes() {
  const location = useLocation();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayLocation, setDisplayLocation] = React.useState(location);
  const [transitionStage, setTransitionStage] = React.useState('entered');
  const nextLocationRef = React.useRef(location);
  const exitTimerRef = React.useRef(null);
  const enterTimerRef = React.useRef(null);

  useErudaDebugConsole();

  React.useEffect(() => {
    return () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
      if (enterTimerRef.current !== null) {
        window.clearTimeout(enterTimerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (location.pathname === displayLocation.pathname) {
      setDisplayLocation(location);
      return;
    }

    if (prefersReducedMotion) {
      setDisplayLocation(location);
      setTransitionStage('entered');
      return;
    }

    nextLocationRef.current = location;

    if (enterTimerRef.current !== null) {
      window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }

    if (transitionStage === 'exiting') {
      return;
    }

    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
    }

    setTransitionStage('exiting');

    exitTimerRef.current = window.setTimeout(() => {
      setDisplayLocation(nextLocationRef.current);
      setTransitionStage('entering');

      enterTimerRef.current = window.setTimeout(() => {
        setTransitionStage('entered');
        enterTimerRef.current = null;
      }, PAGE_ENTER_DURATION_MS);

      exitTimerRef.current = null;
    }, PAGE_EXIT_DURATION_MS);
  }, [location, displayLocation.pathname, prefersReducedMotion, transitionStage]);

  return (
    <>
      <ScrollToTopOnPathChange pathname={displayLocation.pathname} />
      <div
        key={displayLocation.pathname}
        className={`page-transition-shell page-transition-shell--${transitionStage}`}
        aria-busy={transitionStage !== 'entered'}
      >
        <Routes location={displayLocation}>
          <Route path="/" element={<Landing />} />
          <Route path="/tictactoe" element={<TicTacChain />} />
          <Route path="/chess" element={<Chess />} />
          <Route path="/connect4" element={<ConnectFour />} />
          <Route path="/v2/tictactoe" element={<TicTacToeV2 />} />
          <Route path="/v2/connec4" element={<ConnectFourV2 />} />
          <Route path="/v2/connect4" element={<ConnectFourV2 />} />
          <Route path="/v2/chess" element={<ChessV2 />} />
          <Route path="/whitepaper" element={<Whitepaper />} />
          <Route path="/manual" element={<Manual />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  )
}

// Wrapper component to handle wallet browser deep linking on mobile
function App() {
  // Get wallet browser prompt state and handlers
  const { showPrompt, handleWalletChoice, handleContinueChoice } = useWalletBrowserPrompt();

  return (
    <>
      {/* Show wallet browser choice prompt on mobile */}
      {showPrompt && (
        <WalletBrowserPrompt
          onWalletChoice={handleWalletChoice}
          onContinueChoice={handleContinueChoice}
        />
      )}

      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
