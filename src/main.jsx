import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import DreamApp from './DreamApp.jsx'
import Web3Manifesto from './Web3Manifesto.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/dream" element={<DreamApp />} />
        <Route path="/web3" element={<Web3Manifesto />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
