import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './lib/auth';
import { Router } from './lib/router';
import { ToastProvider } from './lib/toast';
import './styles/base.css';
import './styles/public.css';
import './styles/landing.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </Router>
  </React.StrictMode>,
);
