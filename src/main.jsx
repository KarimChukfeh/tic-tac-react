import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './Landing.jsx'
import TicTacBlock from './TicTacBlock.jsx'
import Chess from './Chess.jsx'
import ConnectFour from './ConnectFour.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/tictactoe" element={<TicTacBlock />} />
        <Route path="/chess" element={<Chess />} />
        <Route path="/c4" element={<ConnectFour />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
