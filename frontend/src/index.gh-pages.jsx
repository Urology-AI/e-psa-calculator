import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './App.css';

// GitHub Pages build — clinical staff mode only, sessions sync to Turso.
// Firebase stays uninitialized (VITE_GITHUB_PAGES=true in vite.config.gh-pages.js).
import ClinicalModeFlow from './components/ClinicalModeFlow.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './i18n/i18n.js';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ClinicalModeFlow />
    </ErrorBoundary>
  </React.StrictMode>
);
