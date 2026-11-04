import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { Toaster } from './components/Toast';
import './api/toastInterceptor';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <App />
        <Toaster />
      </MotionConfig>
    </BrowserRouter>
  </React.StrictMode>
);