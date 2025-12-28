import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './Landing.jsx'
import TicTacChain from './TicTacChain.jsx'
import Chess from './Chess.jsx'
import Chess2 from './Chess2.jsx'
import ConnectFour from './ConnectFour.jsx'
import ConnectFour2 from './ConnectFour2.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/tictactoe" element={<TicTacChain />} />
        <Route path="/chess" element={<Chess />} />
        <Route path="/chess2" element={<Chess2 />} />
        <Route path="/c4" element={<ConnectFour />} />
        <Route path="/c42" element={<ConnectFour2 />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
