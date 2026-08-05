import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import DemoShowcase from './components/DemoShowcase.jsx'
import { ErrorBoundary } from '@urology-ai/epsa-ui'
import './i18n/i18n.js'

const isDemo = window.location.pathname === '/demo'

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      {isDemo ? <DemoShowcase /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
)
