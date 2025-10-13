import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router } from "react-router";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={new QueryClient()}>
      <Router>
        <App />
      </Router>
    </QueryClientProvider>
  </React.StrictMode>,
)