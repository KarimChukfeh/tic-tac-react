import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './Landing.jsx'
import TicTacChain from './TicTacChain.jsx'
import Chess from './Chess.jsx'
import ConnectFour from './ConnectFour.jsx'
import NotFound from './NotFound.jsx'
import './index.css'
import { useMetaMaskDeepLink } from './hooks/useMetaMaskDeepLink'

// Wrapper component to handle MetaMask deep linking on mobile
function App() {
  // Attempt MetaMask deep link redirect for mobile devices
  useMetaMaskDeepLink();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/tictactoe" element={<TicTacChain />} />
        <Route path="/chess" element={<Chess />} />
        <Route path="/connect4" element={<ConnectFour />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
