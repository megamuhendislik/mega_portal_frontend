import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { reportFrontendError } from './services/api'

// Global JS hata yakalama
window.onerror = function(message, source, lineno, colno, error) {
  reportFrontendError(error || { message, stack: `${source}:${lineno}:${colno}` }, 'window.onerror');
};

window.addEventListener('unhandledrejection', (event) => {
  reportFrontendError(
    event.reason || { message: 'Unhandled Promise Rejection' },
    'unhandledrejection'
  );
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
