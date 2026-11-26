import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter, HashRouter } from "react-router-dom";
import { Web3Provider } from './context/web3context.jsx';

const Router = import.meta.env.VITE_HASH_ROUTER === "true" ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')).render(
  <Router>
    <StrictMode>
      <Web3Provider>      
        <App />
      </Web3Provider>
    </StrictMode>
  </Router>,
)

