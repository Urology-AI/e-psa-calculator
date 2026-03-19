import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';

// GitHub Pages demo app - no Firebase dependencies
import App from './App.gh-pages.jsx';
import './i18n/i18n.js';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
