import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './Landing.jsx'
import TicTacChain from './TicTacChain.jsx'
import Chess from './Chess.jsx'
import ConnectFour from './ConnectFour.jsx'
import TicTacToeV2 from './v2/pages/TicTacToeV2.jsx'
import ConnectFourV2 from './v2/pages/ConnectFourV2.jsx'
import ChessV2 from './v2/pages/ChessV2.jsx'
import Whitepaper from './Whitepaper.jsx'
import NotFound from './NotFound.jsx'
import WalletBrowserPrompt from './components/WalletBrowserPrompt.jsx'
import './index.css'
import { useWalletBrowserPrompt } from './hooks/useWalletBrowserPrompt'
import { useErudaDebugConsole } from './hooks/useErudaDebugConsole'

function AppRoutes() {
  useErudaDebugConsole();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/tictactoe" element={<TicTacChain />} />
      <Route path="/chess" element={<Chess />} />
      <Route path="/connect4" element={<ConnectFour />} />
      <Route path="/v2/tictactoe" element={<TicTacToeV2 />} />
      <Route path="/v2/connec4" element={<ConnectFourV2 />} />
      <Route path="/v2/connect4" element={<ConnectFourV2 />} />
      <Route path="/v2/chess" element={<ChessV2 />} />
      <Route path="/whitepaper" element={<Whitepaper />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
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
