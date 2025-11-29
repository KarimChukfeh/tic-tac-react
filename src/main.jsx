import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './Landing.jsx'
import App from './App.jsx'
import Chess from './Chess.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/tictactoe" element={<App />} />
        <Route path="/chess" element={<Chess />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
