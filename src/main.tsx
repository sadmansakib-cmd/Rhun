import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  const isPopup = rootEl.getAttribute('data-mode') === 'popup';
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App initialPopupMode={isPopup} />
    </React.StrictMode>
  );
}
