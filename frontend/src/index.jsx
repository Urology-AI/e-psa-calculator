import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import DemoShowcase from './components/DemoShowcase.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './i18n/i18n.js'

// Sentry error monitoring — configure VITE_SENTRY_DSN in .env to enable.
// @sentry/react must be installed: npm install @sentry/react
if (import.meta.env.VITE_SENTRY_DSN) {
  import(/* @vite-ignore */ '@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      // Do not send PII to Sentry — scrub user identifiers
      beforeSend(event) {
        if (event.user) delete event.user.email;
        if (event.user) delete event.user.ip_address;
        return event;
      },
      // Only trace a small percentage of sessions to control volume
      tracesSampleRate: 0.05,
    });
  }).catch(() => {
    // @sentry/react not installed — monitoring disabled
  });
}

const isDemo = window.location.pathname === '/demo'

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      {isDemo ? <DemoShowcase /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
)
